const delay = (time) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

exports.delay = delay;
