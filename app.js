const express = require('express'); // Import the express module
const app = express(); // Create an Express application instance
const port = 3000; // Define the port number

// Define a route for the home page
app.get('/', (req, res) => {
  res.send('Hello World!'); // Send a response
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});