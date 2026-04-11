const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pos/bootstrap',
  method: 'GET',
  headers: {
    'X-Station-Token': 'cmkkkgkw200009hqi' // just some token to bypass if needed? wait, if it's invalid it will 401. I'll just look at the code!
  }
};
