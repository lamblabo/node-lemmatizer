node-lemmatizer
====

node-lemmatizer is a lemmatization library for Node.js to retrieve a base form from an inflected form word in English. 

It is based on [JavaScript Lemmatizer v0.0.2](https://github.com/takafumir/javascript-lemmatizer) which is an amazing work by [Takafumi Yamano](https://github.com/takafumir)

## Install
```
npm install node-lemmatizer
```

## Usage

You can use `Lemmatizer.lemmas` or `Lemmatizer.only_lemmas` methods like the follwoing sample in your JavaScript code.

```javascript
// initialize Lemmatizer.
const lemmatizer = require('node-lemmatizer');

// retrieve a lemma with a part of speech.
// you can assign 'verb' or 'noun' or 'adj' or 'adv' as a part of speech.
lemmatizer.lemmas('desks',  'noun');   // => [ ['desk', 'noun'] ]
lemmatizer.lemmas('talked', 'verb');   // => [ ['talk', 'verb'] ]
lemmatizer.lemmas('coded', 'verb');    // => [ ['code', 'verb'] ]

// of course, available for irregular iflected form words.
lemmatizer.lemmas('went', 'verb');     // => [ ['go', 'verb'] ]
lemmatizer.lemmas('written', 'verb');  // => [ ['write', 'verb'] ]
lemmatizer.lemmas('better', 'adj');    // => [ ['better', 'adj'], ['good', 'adj'] ]

// when multiple base forms are found, return all of them.
lemmatizer.lemmas('leaves', 'noun');   // => [ ['leave', 'noun'], ['leaf', 'noun'] ]

// retrieve a lemma without a part of speech.
lemmatizer.lemmas('sitting');  // => [ ['sit', 'verb'], ['sitting', 'noun'], ['sitting', 'adj'] ]
lemmatizer.lemmas('oxen');     // => [ ['oxen', 'noun'], ['ox', 'noun'] ]
lemmatizer.lemmas('leaves');   // => [ ['leave', 'verb'], ['leave', 'noun'], ['leaf', 'noun'] ]

// retrieve only lemmas not including part of speeches in the returned value.
lemmatizer.only_lemmas('desks', 'noun');  // => [ 'desk' ]
lemmatizer.only_lemmas('coded', 'verb');  // => [ 'code' ]
lemmatizer.only_lemmas('priorities');     // => [ 'priority' ]
lemmatizer.only_lemmas('leaves');         // => [ 'leave', 'leaf' ]
```

## Major changes from JavaScript Lemmatizer v0.0.2:

- browser-based → node module
- Underscore.js features → vanilla JS
- localStorage → store data inside the program
- XHR → dynamic require
- var → let, to have a better scope

## Licence

[MIT License](https://github.com/lamblabo/node-lemmatizer/blob/main/LICENSE.txt)