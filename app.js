'use strict';

const express = require('express');
const employeeRoutes = require('./routes/employee');
const app = express();
const port = parseInt(process.env.PORT || '3000');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve `static` folder as set of static content for client-side assets
app.use(express.static('static'));

app.use('/api/employees', employeeRoutes);

// Send the Test UI HTML page for all requests to the root path
app.get('/', (req, res) => {
    res.sendFile('static/index.html');
});

// Fail over route
app.use(function(req, res) {
    res.status(404).send('Not found');
});

// listen for requests
app.listen(port, function() {
    console.log(`Server is listening on port ${port}`);
});

module.exports = app;
