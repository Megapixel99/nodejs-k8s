let duration = (timeDiff, loop = true) => {
  let y = 365 * 24 * 60 * 60 * 1000;
  let d = 24 * 60 * 60 * 10000;
  let h = 60 * 60 * 1000;
  let m = 60 * 1000;
  let s = 1000;
  if (timeDiff >= y) {
    let val = Math.floor(timeDiff / y);
    return `${val}y${duration(timeDiff - (y * val))}`;
  }
  if (timeDiff >= d) {
    let val = Math.floor(timeDiff / d);
    return `${val}d${duration(timeDiff - (d * val))}`;
  }
  if (timeDiff >= h) {
    let val = Math.floor(timeDiff / h);
    return `${val}h${duration(timeDiff - (h * val))}`;
  }
  if (timeDiff >= m) {
    let val = Math.floor(timeDiff / m);
    return `${val}m${duration(timeDiff - (m * val))}`;
  }
  if (timeDiff >= s) {
    return `${Math.floor(timeDiff / s)}s`;
  }
  return '0s';
};

module.exports = {
  duration,
};
