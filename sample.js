// Example Node.js Express app vulnerable to XSS

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage for comments (for demonstration purposes)
const comments = [];

// Route to handle user comments
app.post('/post-comment', (req, res) => {
  const { comment } = req.body;

  // Store the comment (without proper validation/sanitization)
  comments.push(comment);

  // Render the comment on a page (without escaping)
  res.send(`
    <html>
      <head><title>Comments</title></head>
      <body>
        <h1>Recent Comments</h1>
        <div>${comment}</div> <!-- Vulnerable! -->
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
