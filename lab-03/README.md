# Lab 3: REST API, query parameters, validation, debugging

**Subject:** Backend Development Fundamentals  
**Year/Term:** Year II, Term II  
**University:** Aurora Deemed to be University  
**Faculty:** Mr. Yugandhar  

| Student detail | Value |
| --- | --- |
| Name | G. Manoj Kumar Reddy |
| Registration number | 252U1R3076 |
| Section | CSE-DS-IIB-S-21 |

## Repository Link

**[https://github.com/manojmaverick001-hub/Backend-Development-Fundamentals/tree/main/lab-03](https://github.com/manojmaverick001-hub/Backend-Development-Fundamentals/tree/main/lab-03)**

## Project Overview

This lab evolves the Lab 2 book database into a production-grade RESTful API built with Node.js, Express.js, and SQLite. Endpoint names adhere to REST conventions by using nouns (`/books/`) where the HTTP verb determines the action. The `GET /books/` endpoint supports title search, price-range filtering, flexible sorting, and pagination via query parameters. The create and update endpoints strictly validate incoming request payloads, while all responses adhere to standardized HTTP status codes and a consistent JSON response shape.

## Technologies Used

- **Node.js** (v18.x or later)
- **Express.js** (`^5.3.0`)
- **SQLite** (`sqlite3` and `sqlite` wrapper)
- **Nodemon** (development server auto-restart)
- **VS Code REST Client** (`app.http`) and **Postman** (API testing)

## Project Structure

```text
lab-03/
├── .gitignore
├── README.md
├── app.http
├── app.js
├── goodreads.db
├── package.json
└── Screenshots/
```

> Note: `node_modules/` is created on `npm install` and ignored by Git.

## How to Run

**Prerequisites:** Node.js and npm installed on your machine.

1. Open your terminal and navigate to the `lab-03` directory:
   ```bash
   cd lab-03
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   For development with hot-reload:
   ```bash
   npm run dev
   ```

The server will listen at `http://localhost:3000`.

**Environment Variables:**

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Server port. Defaults to `3000`. Deployment platforms set this automatically. |

On initial startup, the application verifies the database connection, creates the `book` table in `goodreads.db` if it doesn't already exist, and automatically seeds 10 initial records if the table is empty.

## Database Schema

| Column | Type | Constraints / Description |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `title` | TEXT | Book title |
| `author` | TEXT | Book author |
| `price` | INTEGER | Book price in INR |
| `pages` | INTEGER | Number of pages |

## REST API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/books/` | List books with search, price filtering, sorting, and pagination |
| `GET` | `/books/:bookId/` | Retrieve a single book by ID |
| `POST` | `/books/` | Add a new book (with strict payload validation) |
| `PUT` | `/books/:bookId/` | Update an existing book by ID (with validation) |
| `DELETE` | `/books/:bookId/` | Delete a book by ID |

### Query Parameters for `GET /books/`

| Parameter | Default | Allowed Values / Format | Description |
| --- | --- | --- | --- |
| `search_q` | `""` (matches all) | Any string | Partial search matched against title (`LIKE %search_q%`) |
| `order_by` | `id` | `id`, `title`, `author`, `price`, `pages` | Column to sort results by |
| `order` | `ASC` | `ASC`, `DESC` | Sort direction (ascending or descending) |
| `limit` | `10` | Positive integer (`>= 1`) | Maximum number of records to return |
| `offset` | `0` | Non-negative integer (`>= 0`) | Number of records to skip (pagination) |
| `min_price`| `0` | Number (`>= 0`) | Lower price bound (inclusive) |
| `max_price`| `MAX_SAFE_INTEGER` | Number (`min_price <= max_price`) | Upper price bound (inclusive) |

**Example Query:**
```http
GET http://localhost:3000/books/?search_q=the&min_price=300&max_price=450&order_by=price&order=DESC&limit=5&offset=0
```

### Request Payload (`POST /books/` & `PUT /books/:bookId/`)

```json
{
  "title": "Python Basics",
  "author": "John",
  "price": 350,
  "pages": 250
}
```

**Payload Validation Rules:**
- `title`: Required, non-empty string.
- `author`: Required, non-empty string.
- `price`: Required, finite non-negative number (`>= 0`).
- `pages`: Optional, but if provided must be a positive integer (`> 0`).

## HTTP Status Codes & Error Handling

| Scenario | HTTP Status Code | Response Body |
| :--- | :--- | :--- |
| Successful `GET`, `PUT`, or `DELETE` | `200 OK` | Retrieved data or `{ "message": "Book updated/deleted successfully" }` |
| Successful `POST` | `201 Created` | `{ "message": "Book added successfully", "bookId": 11 }` |
| Validation failure / bad query parameter / invalid ID | `400 Bad Request` | `{ "message": "<specific error description>" }` |
| Book ID not found / unknown endpoint route | `404 Not Found` | `{ "message": "Book not found" }` or `{ "message": "Route not found" }` |
| Unexpected runtime or database failure | `500 Internal Server Error` | `{ "message": "<error description>" }` |

All error responses strictly follow the uniform JSON shape `{ "message": "..." }`. A dedicated Express 4-argument error-handling middleware intercepts malformed JSON requests (e.g. `entity.parse.failed`) and returns a `400 Bad Request` response instead of an unformatted HTML error page.

## Security Considerations

- **SQL Injection Prevention:** All dynamic query values (`search_q`, `min_price`, `max_price`, `limit`, `offset`, route params, and body fields) are bound using SQLite parameterized placeholders (`?`).
- **Identifier Allow-Listing:** Because SQL statements do not allow parameter placeholders for identifiers like column names (`ORDER BY`) or sort directions, `order_by` and `order` parameters are strictly checked against predefined allow-lists (`ALLOWED_ORDER_BY` and `ALLOWED_ORDER`). Any unauthorized value immediately triggers a `400 Bad Request`.
- **SQL Injection Test Verification:** Executing `GET /books/?search_q=';DROP TABLE book;--` executes safely as a literal search string returning `[]`, leaving the `book` table intact.

## Test Cases Summary (`app.http`)

| # | Request | Expected Status | Expected Output |
| :--- | :--- | :--- | :--- |
| 1 | `GET /books/` | `200 OK` | Array of 10 books |
| 2 | `GET /books/?search_q=the` | `200 OK` | Books with "the" in title |
| 3 | `GET /books/?order_by=price&order=DESC&limit=3` | `200 OK` | Top 3 most expensive books |
| 4 | `GET /books/?min_price=300&max_price=400` | `200 OK` | Books priced between 300 and 400 |
| 5 | `GET /books/?limit=2&offset=2` | `200 OK` | Books at offset 2 (IDs 3 & 4) |
| 6 | `GET /books/4/` | `200 OK` | Book object with ID 4 |
| 7 | `POST /books/` (valid body) | `201 Created` | `{ "message": "Book added successfully", "bookId": ... }` |
| 8 | `PUT /books/11/` (valid body) | `200 OK` | `{ "message": "Book updated successfully" }` |
| 9 | `DELETE /books/11/` | `200 OK` | `{ "message": "Book deleted successfully" }` |
| 10 | `GET /books/999/` | `404 Not Found` | `{ "message": "Book not found" }` |
| 11 | `GET /books/abc/` | `400 Bad Request` | `{ "message": "bookId must be a positive whole number" }` |
| 12 | `GET /books/?order_by=password` | `400 Bad Request` | Allowed columns error message |
| 13 | `GET /books/?limit=abc` | `400 Bad Request` | Limit validation error message |
| 14 | `GET /books/?min_price=500&max_price=100` | `400 Bad Request` | Price range validation error message |
| 15 | `POST /books/` (missing title) | `400 Bad Request` | Title validation error message |
| 16 | `POST /books/` (string price) | `400 Bad Request` | Price validation error message |
| 17 | `POST /books/` (broken JSON) | `400 Bad Request` | `{ "message": "Invalid JSON in request body" }` |
| 18 | `PUT /books/999/` (non-existent ID) | `404 Not Found` | `{ "message": "Book not found" }` |
| 19 | `DELETE /books/999/` (non-existent ID) | `404 Not Found` | `{ "message": "Book not found" }` |
| 20 | `GET /nothing` | `404 Not Found` | `{ "message": "Route not found" }` |
| 21 | `GET /books/?search_q=';DROP TABLE book;--` | `200 OK` | `[]` (Table remains intact) |

## Screenshots

The `Screenshots/` directory contains complete visual evidence for every test case:

* **Get all books:** `Screenshots/Screenshot 2026-11-03 155003.png`
* **Search by title:** `Screenshots/Screenshot 2026-11-03 155336.png`
* **Sort by price:** `Screenshots/Screenshot 2026-11-03 155346.png`
* **Price range filter:** `Screenshots/Screenshot 2026-11-03 155355.png`
* **Pagination:** `Screenshots/Screenshot 2026-11-03 155404.png`
* **Get single book:** `Screenshots/Screenshot 2026-11-03 155413.png`
* **Add book (201):** `Screenshots/Screenshot 2026-11-03 155459.png`
* **Update book (200):** `Screenshots/Screenshot 2026-11-03 155510.png`
* **Delete book (200):** `Screenshots/Screenshot 2026-11-03 155540.png`
* **Book not found (404):** `Screenshots/Screenshot 2026-11-03 155550.png`
* **Invalid ID (400):** `Screenshots/Screenshot 2026-11-03 155606.png`
* **Invalid sort column (400):** `Screenshots/Screenshot 2026-11-03 155628.png`
* **Invalid limit (400):** `Screenshots/Screenshot 2026-11-03 155641.png`
* **Invalid price range (400):** `Screenshots/Screenshot 2026-11-03 155651.png`
* **Missing title (400):** `Screenshots/Screenshot 2026-11-03 155658.png`
* **Non-numeric price (400):** `Screenshots/Screenshot 2026-11-03 155711.png`
* **Invalid JSON body (400):** `Screenshots/Screenshot 2026-11-03 155737.png`
* **Update missing book (404):** `Screenshots/Screenshot 2026-11-03 155754.png`
* **Delete missing book (404):** `Screenshots/Screenshot 2026-11-03 155811.png`
* **Route not found (404):** `Screenshots/Screenshot 2026-11-03 155817.png`
* **SQL Injection attempt defense:** `Screenshots/Screenshot 2026-11-03 155828.png`

## Common Debugging Issues & Solutions

| Issue | Error Output | Root Cause | Resolution |
| :--- | :--- | :--- | :--- |
| **Port Collision** | `listen EADDRINUSE: address already in use :::3000` | Previous server instance was still bound to port 3000 | Terminated running process via terminal or changed port via `PORT=3001 npm start`. Added error callback in `app.listen`. |
| **Path Resolution** | `Cannot find module '...'` | Incorrect relative module import path | Verified file locations and ensured `./` was used for local module imports. |
| **Table Mismatch** | `SQLITE_ERROR: no such table: ...` | Table identifier typo in SQL query string | Ensured SQL statements match the table name `book`. |
| **Missing Async/Await** | `Promise { <pending> }` or empty responses | Database operation was not properly awaited | Made route handlers `async` and prepended `await` to `db.all()`, `db.get()`, and `db.run()`. |

## Learning Outcomes

- Modeled a RESTful API with resource-oriented URI endpoints.
- Handled flexible filtering, sorting, and pagination via Express query parameters (`req.query`).
- Applied defensive programming techniques including strict request body validation and custom error middlewares.
- Safeguarded SQLite database interactions against SQL injection using parameterized queries and allow-lists.
- Verified and documented comprehensive test coverage across both happy paths and edge cases.

