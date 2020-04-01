module.exports = {
  shuffle: (cards) => {
    var cards_ = cards.slice(),
      shuffled = [];

    while (cards_.length) {
      shuffled.push(cards_.splice(Math.floor(Math.random() * cards_.length), 1)[0]);
    }

    return shuffled;
  },
  randomFourLetters: () => {
    var str = "";

    for (var i = 0; i < 4; i++) {
      str = str + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }

    return str;
  }
}