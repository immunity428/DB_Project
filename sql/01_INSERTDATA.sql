INSERT INTO authors (author_name)
VALUES
('堀向キアヌ'),
('高橋 航平'),
('長沼 毅'),
('きょうちゃん');

INSERT INTO publishers (publisher_name)
VALUES
('SBクリエイティブ'),
('翔泳社'),
('新潮社');

INSERT INTO purchasers (purchaser_id, purchaser_name, position)
VALUES
('K000096', '深谷 将', '教員'),
('T224118', '堀向 キアヌ', '学生'),
('T000002', '山田 太郎', '学生'),
('S000456', 'タンタン', '猿');

INSERT INTO locations (room, shelf)
VALUES
('教員室', '南側本棚'),
('学生室', '本棚1'),
('学生室', '本棚2'),
('動物園', '猿の部屋');

INSERT INTO books
(title, author_id, publisher_id, publish_year, pages, purchaser_id, location_id, purchase_year)
VALUES
('やさしいキアヌの授業', 1, 1, 2017, 512, 'K000096', 1, 2020),
('富岡の強く生きる哲学', 2, 2, 2019, 2000, 'K000096', 2, 2020),
('小泉のよくわかる流体力学', 3, 3, 2011, 229, 'T224118', 3, 2020),
('猿から学ぶデータベース', 3, 3, 2011, 229, 'S000456', 4, 2020);

INSERT INTO genres (genre_name)
VALUES
('プログラミング'),
('C'),
('C++'),
('生物学'),
('進化');

INSERT INTO book_genres (book_id, genre_id)
VALUES
(1,1),
(1,2),
(2,1),
(2,3),
(3,4),
(3,5),
(4,1),
(4,4);

INSERT INTO history (book_id, action, action_year)
VALUES
(1,'新規追加',2020),
(2,'破棄',2025),
(3,'新規追加',2020),
(4,'新規追加',2020)
