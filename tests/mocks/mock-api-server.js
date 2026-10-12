const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const articles = [
    {
        _id: "5f17feace6eba93d8137f9bd",
        title: "Test Article",
        post_id: 123456,
        content: "This is a test article for API testing",
        excerpt: "This is a test article",
        url: "https://example.com/test-article",
        urlid: "test-article",
        author: "Test Author",
        date_published: "2024-01-01T00:00:00.000Z",
        date_modified: "2024-01-01T00:00:00.000Z",
        sections: ["news", "politics"],
        tags: ["test"],
        type: "article",
        status: "publish",
        custom_section_label: null,
        img_thumbnail: null,
        img_full: null,
    },
    {
        _id: "669fa28fda704571f8b9b66d",
        title: "RevEngine Article",
        post_id: 674669,
        content: "Content for vectorize tests from Wordpress post id and RevEngine id.",
        excerpt: "Content for vectorize tests",
        url: "https://example.com/revengine-article",
        urlid: "revengine-article",
        author: "Test Author",
        date_published: "2024-06-01T00:00:00.000Z",
        date_modified: "2024-06-01T00:00:00.000Z",
        sections: ["news"],
        tags: ["vectorize"],
        type: "article",
        status: "publish",
        custom_section_label: null,
        img_thumbnail: null,
        img_full: null,
    },
];

function projectArticle(article, fieldsParam) {
    if (!fieldsParam) return article;
    const fields = String(fieldsParam).split(",").map((f) => f.trim()).filter(Boolean);
    const projected = {};
    for (const field of fields) {
        if (field in article) projected[field] = article[field];
    }
    return projected;
}

// jxp-helper paths: GET /api/:model, GET /api/:model/:id, POST /aggregate/:model
app.get('/api/article/:id', (req, res) => {
    const article = articles.find((a) => a._id === req.params.id);
    if (!article) {
        res.status(404).json({ status: 404, error: "Article not found" });
        return;
    }
    res.json({ status: 200, data: projectArticle(article, req.query.fields) });
});

app.get('/api/article', (req, res) => {
    let filtered = articles;
    if (req.query['filter[post_id]'] != null) {
        const postId = String(req.query['filter[post_id]']);
        filtered = articles.filter((a) => String(a.post_id) === postId);
    }
    res.json({
        status: 200,
        data: filtered.map((a) => projectArticle(a, req.query.fields)),
    });
});

app.post('/aggregate/article', (req, res) => {
    // jxp-helper posts { query: pipeline }
    const pipeline = Array.isArray(req.body?.query)
        ? req.body.query
        : Array.isArray(req.body)
          ? req.body
          : [];
    const matchStage = pipeline.find((stage) => stage && stage.$match);
    const projectStage = pipeline.find((stage) => stage && stage.$project);

    let filtered = articles;
    const postIds = matchStage?.$match?.post_id?.$in;
    if (Array.isArray(postIds)) {
        // One row per requested post_id, preserving the request's value/type so
        // strict equality against Qdrant payload.post_id succeeds in /similar.
        filtered = postIds.map((postId) => {
            const existing = articles.find((a) => String(a.post_id) === String(postId));
            if (existing) {
                return { ...existing, post_id: postId };
            }
            return {
                _id: `mock-${postId}`,
                post_id: postId,
                title: `Mock article ${postId}`,
                url: `https://example.com/${postId}`,
                urlid: String(postId),
                type: "article",
                author: "Mock Author",
                date_published: "2024-01-01T00:00:00.000Z",
                sections: ["news"],
                excerpt: "Mock excerpt",
                img_full: null,
                img_thumbnail: null,
                status: "publish",
                custom_section_label: null,
            };
        });
    }

    const data = filtered.map((article) => {
        if (!projectStage?.$project) return article;
        const projected = {};
        for (const [field, include] of Object.entries(projectStage.$project)) {
            if (include) projected[field] = article[field];
        }
        return projected;
    });

    res.json({ status: 200, data });
});

app.listen(port, () => {
    console.log(`Mock API server running at http://localhost:${port}`);
});
