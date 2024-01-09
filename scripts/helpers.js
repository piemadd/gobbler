require('dotenv').config();

const processHeaders = (headers) => {
  const processedHeaders = {};
  Object.keys(headers).forEach((header) => {
    if (headers[header].startsWith('env.')) {
      const envVar = headers[header].replace('env.', '');
      processedHeaders[header] = process.env[envVar];
    } else {
      processedHeaders[header] = headers[header];
    };
  });
  return processedHeaders;
};

const processURL = (url, urlEnv) => {
  let finalURL = url;
  urlEnv.forEach((replacement) => {
    finalURL = finalURL.replace(replacement, process.env[replacement.replace('env.', '')]);
  })
  return finalURL;
}

module.exports = {
  processHeaders,
  processURL,
}