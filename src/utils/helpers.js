const generateRandomString = (length) => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
};

const formatTimestamp = (date) => {
  return new Date(date).toLocaleString();
};

module.exports = { generateRandomString, formatTimestamp };
