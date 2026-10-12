# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] - 2026-10-12

### Fixed
- Similar recommendations under-returning articles because `group_by` was sent to `/points/search` (ignored); now uses `/points/search/groups` like search
- `history` on POST `/similar` was accepted but never applied; excluded articles are now filtered in Qdrant
- Similar/search limit hard-cap raised from 10 to 50 so clients can request more than 10 results

### Changed
- Similar cache keys include a history hash and a `v2` prefix to avoid serving pre-fix under-filled results

## [1.6.0] - 2026-10-12

### Added
- Qdrant `searchGroups` and `flattenGroups` so search returns distinct articles grouped by `post_id` (best chunk per article)
- Docker Compose MongoDB and JXP host wiring (`host.docker.internal`) for local development

### Fixed
- Date-score normalization when all candidate articles share the same publish date

## [1.5.0] - 2026-09-16

### Added
- Docker build and promote scripts for versioned Harbor images (`docker-build`, `docker-promote-stable`)
- Startup logging helpers and tests for clearer server initialization output

### Changed
- Refactored text chunking for readability and performance; max chunk size reduced to 1000 characters
- Improved embedding error messages with chunk index context
- Package and dependency updates; project renamed to `vector-engine`

### Fixed
- Re-indexing articles via the vectorize API (revengine ID handling)
- Similarity and search results limited to published articles
- Generate encodings when a requested article is missing from the vector store
- More detailed output from the vectorize API

## [1.4.0] - 2025-03-19

### Added
- Attempt to vectorize an article on the fly when it is missing from similarity lookups
- Expanded test environment

### Fixed
- Commander option conflicts for chunk, embeddings, and date flags
- Ensure output directories exist before writing
- Exit the process when bulk vectorizing completes

## [1.3.0] - 2025-03-11

### Changed
- Package upgrades across the stack
- Docker images published via Harbor
- Improved logging and commander option handling
- Bind services to localhost only where appropriate

## [1.2.2] - 2025-02-04

### Added
- Start and end date options for filtering articles during bulk vectorization

### Fixed
- GET search API now accepts the same parameters as POST
- Search filter handling
- Documentation updated to match search API behavior

## [1.2.1] - 2024-10-16

### Fixed
- Search/similarity responses that failed to return a result

### Changed
- Reduced cache TTL to 1 hour
- Quieted some logging noise

## [1.1.0] - 2024-10-02

### Added
- POST endpoints for similarity and search

### Changed
- Similar POST responses aligned with GET response format
- Improved test coverage
- General package upgrades

## [1.0.0] - 2024-07-03

### Added
- Initial release: article extraction, cleaning, chunking, and embedding generation
- Bulk and single-article vectorizers
- REST API for similar articles, natural-language search, and on-demand vectorization
- Redis caching for API responses
- Docker Compose setup including Ollama, Qdrant, MongoDB, and optional GPU acceleration
- Search concept UI
- Configurable MongoDB database name and environment-driven settings
- Metadata support for URLs, status, thumbnails, sections, authors, and images
- Concurrent vectorization and CLI options (date ranges, step-by-step runs, watch mode)
