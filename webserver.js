const express = require("express");
const app = express();

app.use('/', express.static(__dirname + '/dist/prod'));

const port = 8088;

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
