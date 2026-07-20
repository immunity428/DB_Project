SELECT
    b.book_id,
    b.title AS '書籍名',
    b.publish_year AS '出版年',
    b.pages AS 'ページ数',
    p.purchaser_id AS '購入者',
    l.shelf AS '保管場所',
    h.action AS '最新状態',
    g.genre_name AS '代表ジャンル'

FROM books b

JOIN purchasers p
    ON b.purchaser_id = p.purchaser_id

JOIN locations l
    ON b.location_id = l.location_id

JOIN book_genres bg
    ON b.book_id = bg.book_id

JOIN genres g
    ON bg.genre_id = g.genre_id

JOIN history h
    ON b.book_id = h.book_id

WHERE h.action_year = (
    SELECT MAX(h2.action_year)
    FROM history h2
    WHERE h2.book_id = b.book_id
)

GROUP BY
    b.book_id,
    b.title,
    b.publish_year,
    b.pages,
    p.purchaser_id,
    l.shelf,
    h.action,
    g.genre_name
;