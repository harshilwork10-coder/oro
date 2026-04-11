const http = require('https');

const req = http.request({
  hostname: 'www.oronext.app',
  port: 443,
  path: '/api/pos/bootstrap',
  method: 'GET',
  headers: {
    'X-Station-Token': 'cmkkgkw20000913dahqiw9yx4' // Using the same dummy token, maybe it gets a 401, maybe a 403, maybe a 500
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data.substring(0, 500)));
});
req.on('error', console.error);
req.end();
