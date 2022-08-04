const lemmatizer = require('./index.js');

let out = lemmatizer.lemmas('testing')
console.log('Lemmas of the word "testing":');
console.log(out);

if(JSON.stringify(out) === '[["testing","noun"],["test","verb"]]'){
    console.log('\nProgram works perfectly!');
}
