function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function print(text) {
  const current_date = new Date();

  console.log(
    "▱ |" + ` ${current_date.toLocaleString()} ` + "|" + " [INFO]" + ` ${text}`
  );
}

function success(text) {
  const current_date = new Date();

  console.log(
    "▰ |" +
      ` ${current_date.toLocaleString()} ` +
      "|" +
      " [SUCCESS]" +
      ` ${text}`
  );
}

function _error(text) {
  const current_date = new Date();

  console.log(
    "▰ |" + ` ${current_date.toLocaleString()} ` + "|" + " [ERROR]" + ` ${text}`
  );
}

module.exports = { sleep, print, success, _error };
