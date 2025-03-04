const formatResponse = (status, data, message = null) => {
  return {
    status,
    message,
    data,
  };
};

module.exports = { formatResponse };
