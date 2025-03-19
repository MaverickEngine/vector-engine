const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Sample data
const articles = [
    {
        _id: "5f17feace6eba93d8137f9bd",
        title: "Test Article",
        post_id: "123456",
        content: "This is a test article for API testing",
        sections: ["news", "politics"],
        // Add other fields as needed
    }
];

// Mock JXP API endpoints
app.get('/article/:id', (req, res) => {
    const article = articles.find(a => a._id === req.params.id);
    if (article) {
        res.json({ status: 200, data: article });
    } else {
        res.status(404).json({ status: 404, error: "Article not found" });
    }
});

app.get('/article', (req, res) => {
    // Filter by post_id if provided
    let filteredArticles = articles;
    if (req.query['filter[post_id]']) {
        filteredArticles = articles.filter(a => a.post_id === req.query['filter[post_id]']);
    }
    res.json({ status: 200, data: filteredArticles });
});

app.post('/article/aggregate', (req, res) => {
    // Handle aggregate requests
    res.json({ status: 200, data: articles });
});

app.listen(port, () => {
    console.log(`Mock API server running at http://localhost:${port}`);
}); 