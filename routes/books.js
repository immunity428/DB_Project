const express=require("express");

const router=express.Router();

const db=require("../db");

router.get("/",async(req,res)=>{

    const keyword=req.query.q || "";
    const sortBy=req.query.sort || "ID";//デフォルトはID順
    const searchTerm=`%${keyword}%`;

    //ソート

    let orderClause = "ORDER BY b.book_id ASC";
    
    if(sortBy==="title"){

        orderClause="ORDER BY b.title ASC";

    }else if(sortBy==="year"){

        orderClause= "ORDER BY b.publish_year DESC";
    
    } else if(sortBy==="pages"){
        
        orderClause="ORDER BY b.pages DESC";
    
    } else if(sortBy==="purchaser"){
        
        orderClause="ORDER BY p.purchaser_id ASC";

    }
    
    // SQLクエリの実行
    const [books]=await db.query(`

        SELECT
        b.book_id,
        b.title,
        b.publish_year,
        b.pages,
        COALESCE(p.purchaser_id, '-') AS purchaser_id,
        COALESCE(l.shelf, '-') AS shelf,
        COALESCE(latest_history.action, '-') AS action

        FROM books b

        LEFT JOIN purchasers p
        ON b.purchaser_id=p.purchaser_id

        LEFT JOIN locations l
        ON b.location_id=l.location_id

        LEFT JOIN authors a
        ON b.author_id=a.author_id

        LEFT JOIN (
            SELECT h.book_id, h.action
            FROM history h
            WHERE h.history_id = (
                SELECT h2.history_id
                FROM history h2
                WHERE h2.book_id = h.book_id
                ORDER BY h2.action_year DESC, h2.history_id DESC
                LIMIT 1
            )
        ) latest_history
        ON b.book_id = latest_history.book_id

        LEFT JOIN publishers pub
        ON b.publisher_id=pub.publisher_id

        WHERE (b.title LIKE ?
        OR a.author_name LIKE ?
        OR pub.publisher_name LIKE ?)

        ${orderClause}

    `,[searchTerm,searchTerm,searchTerm]);

    res.render("index",{books, keyword, sortBy});

    });

router.get("/new",(req,res)=>{
    res.render("new", {
        errorMessage: null,
        formData: {
            title: "",
            author_name: "",
            publisher_name: "",
            publish_year: "",
            pages: "",
            purchaser_id: "",
            genres: "",
            location_room: "",
            location_shelf: "",
            action_year: new Date().getFullYear()
        }
    });
});

router.post("/new",async(req,res)=>{
    const {title,publish_year,pages,purchaser_id,author_name,publisher_name,genres,location_room,location_shelf,action,action_year}=req.body;

    const formData={
        title: title || "",
        author_name: author_name || "",
        publisher_name: publisher_name || "",
        publish_year: publish_year || "",
        pages: pages || "",
        purchaser_id: purchaser_id || "",
        genres: genres || "",
        location_room: location_room || "",
        location_shelf: location_shelf || "",
        action_year: action_year || ""
    };

    const trimmedTitle=typeof title === "string" ? title.trim() : "";
    const trimmedAuthor=typeof author_name === "string" ? author_name.trim() : "";
    const trimmedPublisher=typeof publisher_name === "string" ? publisher_name.trim() : "";
    const trimmedActionYear=typeof action_year === "string" ? action_year.trim() : "";

    if(!trimmedTitle || !trimmedAuthor || !trimmedPublisher || !trimmedActionYear){
        return res.status(400).render("new", {
            errorMessage: "書籍名・著者・出版社・状態変更年は必須です。",
            formData
        });
    }

    if(publish_year && !/^\d+$/.test(publish_year.trim())){
        return res.status(400).render("new", {
            errorMessage: "出版年は半角数字で入力してください。",
            formData
        });
    }

    if(pages && !/^\d+$/.test(pages.trim())){
        return res.status(400).render("new", {
            errorMessage: "ページ数は半角数字で入力してください。",
            formData
        });
    }

    const normalizedPublishYear = publish_year && publish_year.trim() !== "" ? Number(publish_year) : null;
    const normalizedPages = pages && pages.trim() !== "" ? Number(pages) : null;
    const normalizedActionYear = Number(trimmedActionYear);
    const normalizedLocationRoom = location_room && location_room.trim() !== "" ? location_room.trim() : "-";
    const normalizedLocationShelf = location_shelf && location_shelf.trim() !== "" ? location_shelf.trim() : "-";
    const normalizedPurchaserId = purchaser_id && purchaser_id.trim() !== "" ? purchaser_id.trim() : null;

    // 入力値の正規化
    const [authorResult]=await db.query(`

        SELECT author_id FROM authors WHERE author_name=?

    `,[trimmedAuthor]);

    let authorId;
    if(authorResult.length>0){

        authorId=authorResult[0].author_id;

    } else {
        // 著者が存在しない場合は新規作成
        const [newAuthor]=await db.query(`

            INSERT INTO authors (author_name) VALUES (?)
        
        `,[trimmedAuthor]);
        authorId=newAuthor.insertId;
    }
    // 出版社の取得または新規作成
    const [publisherResult]=await db.query(`
        
        SELECT publisher_id FROM publishers WHERE publisher_name=?
        
    `,[trimmedPublisher]);

    let publisherId;

    if(publisherResult.length>0){

        publisherId=publisherResult[0].publisher_id;

    } else {
        // 出版社が存在しない場合は新規作成
        const [newPublisher]=await db.query(`

            INSERT INTO publishers (publisher_name) VALUES (?)

        `,[trimmedPublisher]);
        publisherId=newPublisher.insertId;
    }
    // 保管場所の取得または新規作成
    const [locationResult]=await db.query(`

        SELECT location_id FROM locations WHERE room=? AND shelf=?

    `,[normalizedLocationRoom,normalizedLocationShelf]);

    let locationId;

    if(locationResult.length>0){

        locationId=locationResult[0].location_id;

    } else {
        // 保管場所が存在しない場合は新規作成
        const [newLocation]=await db.query(`

            INSERT INTO locations (room, shelf) VALUES (?, ?)

        `,[normalizedLocationRoom,normalizedLocationShelf]);
        locationId=newLocation.insertId;
    }
    // 購入者の取得または新規作成
    const [purchaserResult]=await db.query(`

        SELECT purchaser_id FROM purchasers WHERE purchaser_id=?

    `,[normalizedPurchaserId]);

    if(purchaserResult.length===0 && normalizedPurchaserId){
        // 購入者が存在しない場合は新規作成
        await db.query(`

            INSERT INTO purchasers (purchaser_id, purchaser_name, position) VALUES (?, ?, ?)
        
            `,[normalizedPurchaserId, normalizedPurchaserId, "未設定"]);
    }
    // 書籍の追加
    const [bookResult]=await db.query(`

        INSERT INTO books (title, author_id, publisher_id, publish_year, pages, purchaser_id, location_id, purchase_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)

    `,[trimmedTitle, authorId, publisherId, normalizedPublishYear, normalizedPages, normalizedPurchaserId, locationId, normalizedActionYear]);

    const bookId=bookResult.insertId;

    const genreNames=genres
        ? genres.split(',').map(name=>name.trim()).filter(Boolean)
        : [];

    for(const genreName of genreNames){
        // ジャンルの取得または新規作成
        const [existingGenre]=await db.query(`

            SELECT genre_id FROM genres WHERE genre_name=?

        `,[genreName]);
        let genreId;
        if(existingGenre.length>0){
            genreId=existingGenre[0].genre_id;
        } else {
            // ジャンルが存在しない場合は新規作成
            const [newGenre]=await db.query(`

                INSERT INTO genres (genre_name) VALUES (?)

            `,[genreName]);
            genreId=newGenre.insertId;
        }
        // 書籍とジャンルの関連付け
        await db.query(`

            INSERT INTO book_genres (book_id, genre_id) VALUES (?, ?)

        `,[bookId, genreId]);
    }
    // 履歴の追加
    await db.query(`
        
        INSERT INTO history (book_id, action_year, action) VALUES (?, ?, ?)`
        
    ,[bookId, normalizedActionYear, '新規追加']);

    res.redirect("/");
});

router.get("/purchasers",async(req,res)=>{
    // 購入者一覧の取得
    const [purchasers]=await db.query(`

        SELECT
        p.purchaser_id,
        p.purchaser_name,
        p.position
        FROM purchasers p
        ORDER BY p.purchaser_id ASC

    `);

    res.render("purchasers",{purchasers});
});

router.get("/purchasers/:id",async(req,res)=>{
    const purchaserId=req.params.id;
    // 購入者詳細と関連書籍の取得
    const [rows]=await db.query(`

        SELECT
        p.purchaser_id,
        p.purchaser_name,
        p.position,
        b.book_id,
        b.title,
        b.publish_year,
        latest_history.action,
        GROUP_CONCAT(g.genre_name SEPARATOR ', ') AS genres
        FROM purchasers p
        LEFT JOIN books b
        ON p.purchaser_id=b.purchaser_id
        LEFT JOIN (
            SELECT h.book_id, h.action
            FROM history h
            WHERE h.history_id = (
                SELECT h2.history_id
                FROM history h2
                WHERE h2.book_id = h.book_id
                ORDER BY h2.action_year DESC, h2.history_id DESC
                LIMIT 1
            )
        ) latest_history
        ON b.book_id = latest_history.book_id
        LEFT JOIN book_genres bg
        ON b.book_id=bg.book_id
        LEFT JOIN genres g
        ON bg.genre_id=g.genre_id
        WHERE p.purchaser_id=?
        GROUP BY p.purchaser_id, p.purchaser_name, p.position, b.book_id, b.title, b.publish_year, latest_history.action
        ORDER BY b.title ASC

    `,[purchaserId]);

    if(rows.length===0){
        return res.status(404).send("該当する購入者が見つかりません");
    }

    const purchaser=rows[0];
    res.render("purchaser-detail",{purchaser, books: rows});
});

router.get("/genres",async(req,res)=>{
    // ジャンル一覧の取得
    const [genres]=await db.query(`

        SELECT
        g.genre_id,
        g.genre_name
        FROM genres g
        ORDER BY g.genre_name ASC

    `);

    res.render("genres",{genres});
});

router.get("/genres/:id",async(req,res)=>{
    const genreId=req.params.id;
    // ジャンル詳細と関連書籍の取得
    const [rows]=await db.query(`

        SELECT
        g.genre_id,
        g.genre_name,
        b.title,
        b.publish_year,
        latest_history.action
        FROM genres g
        LEFT JOIN book_genres bg
        ON g.genre_id=bg.genre_id
        LEFT JOIN books b
        ON bg.book_id=b.book_id
        LEFT JOIN (
            SELECT h.book_id, h.action
            FROM history h
            WHERE h.history_id = (
                SELECT h2.history_id
                FROM history h2
                WHERE h2.book_id = h.book_id
                ORDER BY h2.action_year DESC, h2.history_id DESC
                LIMIT 1
            )
        ) latest_history
        ON b.book_id = latest_history.book_id
        WHERE g.genre_id=?
        ORDER BY b.title ASC

    `,[genreId]);

    if(rows.length===0){
        return res.status(404).send("該当するジャンルが見つかりません");
    }

    res.render("genre-detail",{genre: rows[0], books: rows});
});

router.get("/detail/:id",async(req,res)=>{

    const bookId=req.params.id;
    // 書籍詳細の取得
    const [rows]=await db.query(`

        SELECT
        b.book_id,
        b.title,
        b.publish_year,
        b.pages,
        a.author_name,
        p.publisher_name,
        pu.purchaser_name,
        pu.position,
        l.room,
        l.shelf,
        latest_history.action AS action,
        latest_history.action_year AS action_year,
        GROUP_CONCAT(g.genre_name SEPARATOR ', ') AS genres

        FROM books b

        JOIN authors a
        ON b.author_id=a.author_id

        JOIN publishers p
        ON b.publisher_id=p.publisher_id

        LEFT JOIN purchasers pu
        ON b.purchaser_id=pu.purchaser_id

        LEFT JOIN locations l
        ON b.location_id=l.location_id

        LEFT JOIN (
            SELECT h.book_id, h.action, h.action_year
            FROM history h
            WHERE h.history_id = (
                SELECT h2.history_id
                FROM history h2
                WHERE h2.book_id = h.book_id
                ORDER BY h2.action_year DESC, h2.history_id DESC
                LIMIT 1
            )
        ) latest_history
        ON b.book_id = latest_history.book_id

        LEFT JOIN book_genres bg
        ON b.book_id=bg.book_id

        LEFT JOIN genres g
        ON bg.genre_id=g.genre_id

        WHERE b.book_id=?

        GROUP BY b.book_id

    `,[bookId]);

    const book=rows[0];

    if(!book){
        return res.status(404).send("該当する書籍が見つかりません");
    }

    res.render("detail",{book});

});

router.get("/edit/:id",async(req,res)=>{

    const bookId=req.params.id;
    // 書籍詳細の取得
    const [rows]=await db.query(`

        SELECT
        b.book_id,
        b.title,
        b.publish_year,
        b.pages,
        b.purchaser_id,
        l.shelf,
        latest_history.action AS action,
        GROUP_CONCAT(g.genre_name SEPARATOR ', ') AS genres

        FROM books b

        LEFT JOIN locations l
        ON b.location_id=l.location_id

        LEFT JOIN (
            SELECT h.book_id, h.action
            FROM history h
            WHERE h.history_id = (
                SELECT h2.history_id
                FROM history h2
                WHERE h2.book_id = h.book_id
                ORDER BY h2.action_year DESC, h2.history_id DESC
                LIMIT 1
            )
        ) latest_history
        ON b.book_id = latest_history.book_id

        LEFT JOIN book_genres bg
        ON b.book_id=bg.book_id

        LEFT JOIN genres g
        ON bg.genre_id=g.genre_id

        WHERE b.book_id=?

        GROUP BY b.book_id

    `,[bookId]);

    const book=rows[0];

    if(!book){
        return res.status(404).send("該当する書籍が見つかりません");
    }

    res.render("edit",{book});

});

router.post("/edit/:id",async(req,res)=>{

    const bookId=req.params.id;
    const {title,publish_year,pages,purchaser_id,action,genres}=req.body;

    const normalizedTitle=title ? title.trim() : "";
    const normalizedPublishYear=publish_year && publish_year !== "" ? Number(publish_year) : null;
    const normalizedPages=pages && pages !== "" ? Number(pages) : null;
    const normalizedPurchaserId=purchaser_id && purchaser_id.trim() ? purchaser_id.trim() : null;
    const normalizedAction=action ? action.trim() : "新規追加";
    // 購入者の存在確認と新規作成
    if(normalizedPurchaserId){
        const [purchaserResult]=await db.query(`
            
            SELECT purchaser_id FROM purchasers WHERE purchaser_id=?
            
        `,[normalizedPurchaserId]);
        if(purchaserResult.length===0){
            await db.query(`
                
                INSERT INTO purchasers (purchaser_id, purchaser_name, position) VALUES (?, ?, ?)
                
            `,[normalizedPurchaserId, normalizedPurchaserId, "未設定"]);
        }
    }
    // 書籍情報の更新
    await db.query(`

        UPDATE books
        SET title=?, publish_year=?, pages=?, purchaser_id=?
        WHERE book_id=?

    `,[normalizedTitle,normalizedPublishYear,normalizedPages,normalizedPurchaserId,bookId]);
    // 既存のジャンル関連を削除
    await db.query(`
        
        DELETE FROM book_genres WHERE book_id=?
        
    `,[bookId]);
    // 履歴の更新または新規作成
    const [existingHistory]=await db.query(`
        
        SELECT history_id FROM history WHERE book_id=? ORDER BY history_id DESC LIMIT 1
        
        `,[bookId]);

    if(existingHistory.length>0){
        await db.query(`
            
            UPDATE history SET action=? WHERE history_id=?
            
        `,[normalizedAction, existingHistory[0].history_id]);

    } else {
        await db.query(`
            
            INSERT INTO history (book_id, action_year, action) VALUES (?, ?, ?)`
            
        ,[bookId, new Date().getFullYear(), normalizedAction]);
    }
    // ジャンルの更新
    const genreNames=genres
        ? genres.split(',').map(name=>name.trim()).filter(Boolean)
        : [];

    for(const genreName of genreNames){
        const [existingGenre]=await db.query(`
            
            SELECT genre_id FROM genres WHERE genre_name=?
            
        `,[genreName]);

        let genreId;

        if(existingGenre.length>0){
            genreId=existingGenre[0].genre_id;
        } else {
            const [result]=await db.query(`
                
                INSERT INTO genres (genre_name) VALUES (?)
                
            `,[genreName]);
            genreId=result.insertId;
        }

        await db.query(`
            
            INSERT INTO book_genres (book_id, genre_id) VALUES (?, ?)
            
        `,[bookId, genreId]);
    }

    res.redirect("/");

});
// 書籍削除のルート
router.post("/delete/:id",async(req,res)=>{

    const bookId=req.params.id;

    await db.query(`
        
        DELETE FROM history WHERE book_id=?
        
    `,[bookId]);
    await db.query(`
        
        DELETE FROM book_genres WHERE book_id=?
        
    `,[bookId]);
    await db.query(`
        
        DELETE FROM books WHERE book_id=?
        
    `,[bookId]);

    res.redirect("/");

});

module.exports=router;