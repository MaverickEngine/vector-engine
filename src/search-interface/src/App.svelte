<script>
    let searchQuery = "";
    let searchResult = null;
    let isLoading = false;

    async function handleSearch() {
        if (!searchQuery.trim()) return;

        isLoading = true;
        try {
            const response = await fetch(
                `http://localhost:8001/search/${encodeURIComponent(searchQuery.trim())}`,
            );
            searchResult = await response.json();
        } catch (error) {
            console.error("Error fetching search results:", error);
            searchResult = { error: "Failed to fetch search results" };
        } finally {
            isLoading = false;
        }
    }

    function handleKeyDown(event) {
        if (event.key === "Enter") {
            handleSearch();
        }
    }
</script>

<main class="container mt-5">
    <h1 class="mb-4">Daily Maverick Search</h1>
    <div class="input-group mb-3">
        <input
            type="text"
            class="form-control"
            placeholder="Enter search query"
            bind:value={searchQuery}
            on:keydown={handleKeyDown}
            aria-label="Search query"
        />
        <button
            class="btn btn-primary"
            type="button"
            on:click={handleSearch}
            disabled={isLoading}
            aria-label="Search"
        >
            {#if isLoading}
                <span
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                ></span>
                <span class="visually-hidden">Loading...</span>
            {:else}
                Search
            {/if}
        </button>
    </div>

    {#if searchResult}
        <div class="mt-4">
            <h2>Search Results</h2>
            {#if searchResult.error}
                <p class="text-danger">{searchResult.error}</p>
            {:else if searchResult.length === 0}
                <p>No results found.</p>
            {:else}
                {#each searchResult as result}
                    <div class="card mb-3">
                        <div class="row g-0">
                            <div class="col-md-3">
                                {#if result.payload.img_thumbnail}
                                    <img
                                        src={result.payload.img_thumbnail}
                                        alt={result.payload.title}
                                        class="img-fluid rounded-start h-100 object-fit-cover"
                                    />
                                {:else}
                                    <div
                                        class="bg-light h-100 d-flex align-items-center justify-content-center"
                                    >
                                        <span class="text-muted">No image</span>
                                    </div>
                                {/if}
                            </div>
                            <div class="col-md-9">
                                <div class="card-body">
                                    {#if result.payload.custom_section_label}
                                        <p
                                            class="text-uppercase text-muted mb-1 small fw-bold"
                                        >
                                            {result.payload
                                                .custom_section_label}
                                        </p>
                                    {/if}
                                    <h3 class="card-title mb-1">
                                        {result.payload.title}
                                    </h3>
                                    <p class="text-muted mb-2">
                                        {result.payload.author} • {new Date(
                                            result.payload.date_published,
                                        ).toLocaleDateString()}
                                    </p>
                                    <p class="card-text">
                                        {result.payload.excerpt}
                                    </p>
                                    <a
                                        href={result.payload.url}
                                        class="btn btn-outline-primary btn-sm"
                                        target="_blank"
                                        rel="noopener noreferrer">Read more</a
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</main>

<style>
    /* You can add any custom styles here */
</style>
