const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8; // Example rule
};

const validateName = (name) => {
  return name.length > 1; // Must be at least 2 characters
};

module.exports = { validateEmail, validatePassword, validateName };
