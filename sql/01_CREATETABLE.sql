CREATE TABLE authors (
    author_id INT NOT NULL AUTO_INCREMENT,
    author_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (author_id)
);

CREATE TABLE publishers (
    publisher_id INT AUTO_INCREMENT PRIMARY KEY,
    publisher_name VARCHAR(100) NOT NULL
);

CREATE TABLE purchasers (
    purchaser_id VARCHAR(20) PRIMARY KEY,
    purchaser_name VARCHAR(100) NOT NULL,
    position VARCHAR(30) NOT NULL
);

CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    room VARCHAR(50) NOT NULL,
    shelf VARCHAR(50) NOT NULL
);

CREATE TABLE books (
    book_id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    author_id INT NOT NULL,
    publisher_id INT NOT NULL,
    publish_year INT,
    pages INT,
    purchaser_id VARCHAR(20),
    location_id INT,
    purchase_year INT,
    PRIMARY KEY (book_id),
    FOREIGN KEY (author_id) REFERENCES authors(author_id),
    FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id),
    FOREIGN KEY (purchaser_id) REFERENCES purchasers(purchaser_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE genres (
    genre_id INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(50) NOT NULL
);

CREATE TABLE book_genres (
    book_id INT,
    genre_id INT,
    PRIMARY KEY (book_id, genre_id),

    FOREIGN KEY (book_id) REFERENCES books(book_id),
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
);


CREATE TABLE history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    
    action_year INT NOT NULL,
    action ENUM('新規追加', '破棄', '貸出', '返却', '行方不明') NOT NULL,

    FOREIGN KEY (book_id) REFERENCES books(book_id)
);