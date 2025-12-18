'use strict';
const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const app         = express();
const cors        = require('cors');
const bcrypt      = require('bcrypt');
fccTesting(app);
const saltRounds = 12;
const myPlaintextPassword = 'sUperpassw0rd!';
const someOtherPlaintextPassword = 'pass123';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Hello World!");
});

app.get('/_api/package.json', (req, res) => {
  res.json(require('./package.json'));
});

//START_ASYNC -do not remove notes, place code between correct pair of notes.

bcrypt.hash(myPlaintextPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
  } else {
    console.log(hash);

    bcrypt.compare(myPlaintextPassword, hash, (err, res) => {
      if (err) {
        console.error(err);
      } else {
        console.log(res); 
      }
    });
  }
});

//END_ASYNC

//START_SYNC



//END_SYNC





























const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Listening on port:", PORT)
});
