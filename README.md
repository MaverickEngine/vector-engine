# VectorEngine

Vector Engine creates embeddings from Daily Maverick articles, stores them in a database, and provides a REST API to perform comparrison operations on the embeddings. 

It consists of three primary components:

## Components

### Bulk vectorizer

The bulk vectorizer exports all the articles from Daily Maverick, and runs them through the vectorization process. 

### Article vectorizer

The article vectorizer takes a single article ID and runs it through the vectorization process. If the article is not in the database, it will be added. If it is already in the database, it will be updated.

### REST API

The REST API provides endpoints to find similar articles, to perform natural-language searches, and to trigger vectorizing individual articles.

## Process

The article vectorization process is as follows:

1. The article is extracted from the RevEngine API.
2. The article is cleaned. We remove HTML tags, scripts and Wordpress shortcodes. We also normalize paragraph breaks. 
2. The article is chunked if necessary. We prefer full articles, but if the article is too long, we will split it into chunks. We add a header to the start of each chunk so that they relate to one another.
3. Each chunk is vectorized using the all-minilm model.
4. The vectors are stored with metadata in a Qdrant database.

## Requirements

- Qdrant
- Redis
- Node.js

## Installation

1. Clone the repository
2. Run `npm install`
3. Create a `.env` file in the root directory of the project.
4. Add the following variables to the `.env` file:
- `JXP_SERVER` - The URL of the JXP server
- `JXP_API_KEY` - The API key for the JXP server
- `REDIS_HOST` - The host of the Redis server, defaults to `localhost`
- `REDIS_PORT` - The port of the Redis server, defaults to `6379`
- `REDIS_PASSWORD` - The password for the Redis server, defaults to no password
- `HOST` - The host of the server, defaults to `127.0.0.1`
- `PORT` - The port of the server, defaults to `8001`
5. Start the server with `npm start`

## Docker

The project includes a `Dockerfile` and `docker-compose.yml` file. To run the project in Docker, run the following commands:

```bash
docker-compose build
docker-compose up -d
```

## Bulk Vectorizing

To bulk vectorize all the articles, run the following command:

```bash
node vectorize.js
```

The process should take a few hours to complete. It creates a folder called "articles" which contains the articles in each step of the process. If you want to rerun the process from the last point, do not delete this folder and the command will skip most of the work. If you want to start over, delete the folder and rerun the command.

## API

The API server will be available at `http://localhost:8001`, or whatever host and port you have set in the `.env` file.

The API provides the following endpoints:

### GET /similar/:id

ID can be either a Wordpress post ID or a RevEngine article ID. The endpoint will return the 5 most similar articles to the provided ID from the last 30 days.

Note that the article must have already been vectorized and stored in the DB.

### POST /search

The body of the request should be a JSON object with the following properties:
```json
{
    "query": "search query",
    "limit": 5,
    "previous_days": 30,
    "section": "section name",
    "tag": "tag name"
}
```

The endpoint will return the 5 most similar articles to the provided search query.

### POST /vectorize

ID can be either a Wordpress post ID or a RevEngine article ID. The endpoint will vectorize the article with the provided ID.

Body:
```json
{
    "post_id": 1234, # Either a Wordpress post ID
    "revengine_id": 5678 # Or a RevEngine article ID
}
```

## Caching

Caching is set for 24 hours. Response time for the `/similar/:id` endpoint can be as high as ~200ms for an uncached request, but should drop to ~10ms for a cached request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.