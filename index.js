/*
* node-lemmatizer ©lamblabo
* https://github.com/lamblabo/node-lemmatizer
* MIT License
* 
* based on the following project:
* JavaScript Lemmatizer v0.0.2 by Takafumi Yamano
* https://github.com/takafumir/javascript-lemmatizer
* MIT License
*/

// programStorage
let Storage = function() {
  this.storage = new Object();
}

Storage.prototype = {
  getItem: function(key){
    return this.storage[key];
  },
  setItem: function(key, data){
    this.storage[key] = data;
  }
}

let programStorage = new Storage();

// extend String and define String#endsWith
if (typeof String.endsWith !== "function") {
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}

// Lemmatizer constructor
let Lemmatizer = function() {
  this.wn_files = {
    noun: [
      './dict/index.noun.json',
      './dict/noun.exc.json'
    ],
    verb: [
      './dict/index.verb.json',
      './dict/verb.exc.json'
    ],
    adj:  [
      './dict/index.adj.json',
      './dict/adj.exc.json'
    ],
    adv:  [
      './dict/index.adv.json',
      './dict/adv.exc.json'
    ]
  };

  this.morphological_substitutions = {
    noun: [
      ['ies',  'y'  ],
      ['ves',  'f'  ],
      ['men',  'man']
    ],
    verb: [
      ['ies', 'y'],
      ['ied', 'y'],
      ['cked', 'c'],
      ['cked', 'ck'],
      ['able', 'e'],
      ['able', ''],
      ['ability', 'e'],
      ['ability', '']
    ],
    adj:  [
      ['er',  '' ],
      ['est', '' ],
      ['er',  'e'],
      ['est', 'e'],
      ['ier', 'y'],
      ['iest', 'y']
    ],
    adv:  [
      ['er',  '' ],
      ['est', '' ],
      ['er',  'e'],
      ['est', 'e'],
      ['ier', 'y'],
      ['iest', 'y']
    ]
  };

  this.wordlists  = {};
  this.exceptions = {};

  // initialize wordlists and exceptions
  for (let key in this.morphological_substitutions) {
    this.wordlists[key] = {};
    this.exceptions[key] = {};
  }

  // store dictionary data to programStorage from wn_files
  for (let pos in this.wn_files) {
    this.load_wordnet_files(pos, this.wn_files[pos][0], this.wn_files[pos][1]);
  }

  // fetch dictionary data from programStorage, then set up wordlists and exceptions
  for (let pos in this.wn_files) {
    this.setup_dic_data(pos);
  }
};

// Lemmatizer properties
Lemmatizer.prototype = {
  form: '',
  idx: '_idx',
  exc: '_exc',
  lems: [], // -> [ ["lemma1", "verb"], ["lemma2", "noun"]... ]

  // **************************************************
  // public
  // **************************************************
  // reuturn Array of ["lemma", "pos"] pairs
  // like [ ["lemma1", "verb"], ["lemma2", "noun"]... ]
  lemmas: function(form, pos) {
    let self = this;
    this.lems = [];
    this.form = form;

    let parts = ['verb', 'noun', 'adj', 'adv'];
    if ( pos && !parts.includes( pos ) ) {
      console.log("warning: pos must be 'verb' or 'noun' or 'adj' or 'adv'.");
      return;
    }

    if (!pos) {
      parts.forEach( function(pos) { self.irregular_bases(pos); } );
      parts.forEach( function(pos) { self.regular_bases(pos); } );

      // when lemma not found and the form is included in wordlists.
      if ( this.is_lemma_empty() ) {
        parts
         .filter( function(pos) { return self.wordlists[pos][form]; } )
         .forEach( function(pos) { self.lems.push([ form, pos ]); } );
      }
      // when lemma not found and the form is not included in wordlists.
      if ( this.is_lemma_empty() ) {
        this.lems.push([ form, '' ]);
      }
    } else {
      this.base_forms(pos);
      if ( this.is_lemma_empty() ) {
        this.lems.push([ form, pos ]);
      }
    }

    const sortBy = (key) => {
      return (a, b) => (a[key] > b[key]) ? 1 : ((b[key] > a[key]) ? -1 : 0);
    };

    // sort to verb -> noun -> adv -> adj
    return this.uniq_lemmas(this.lems).concat().sort(sortBy( function(val) { return val[1]; } )).reverse();
  },

  // return only uniq lemmas without pos like [ 'high' ] or [ 'leave', 'leaf' ]
  only_lemmas: function(form, pos) {
    let result = this.lemmas(form, pos).map( function(val) { return val[0]; } );
    return [...new Set(result)];
  },


  // **************************************************
  // private
  // The following properties(methods) are only used by
  // Lemmatizer inside, so don't call them from outside.
  // **************************************************
  is_lemma_empty: function() {
    return this.lems.length === 0;
  },

  // set up dictionary data
  load_wordnet_files: function(pos, list, exc) {
    let key_idx = pos + this.idx;
    this.open_file(key_idx, list);
    let key_exc = pos + this.exc; 
    this.open_file(key_exc, exc);
  },

  setup_dic_data: function(pos) {
    let self = this;
    let key_idx = pos + this.idx;
    this.fetch_data(key_idx).forEach( function(w) {
      self.wordlists[pos][w] = w;
    });
    let key_exc = pos + this.exc; 
    this.fetch_data(key_exc).forEach( function(item) {
      let w = item[0];
      let s = item[1];
      self.exceptions[pos][w] = s;
    });
  },

  open_file: function(key, file) {
    if (!programStorage.getItem(key)) {
      let data = require(`${file}`);
      this.store_data(key, JSON.stringify(data));
    }
  },

  store_data: function(key, data) {
    programStorage.setItem(key, data);
  },

  fetch_data: function(key) {
    let data = JSON.parse(programStorage.getItem(key));
    return data;
  },
  // end of set up dictionary data

  base_forms: function(pos) {
    this.irregular_bases(pos);
    this.regular_bases(pos);
  },

  // build array lemmas(this.lems) like [ [lemma1, "verb"], [lemma2, "noun"]... ]
  irregular_bases: function(pos) {
    if (this.exceptions[pos][this.form] && this.exceptions[pos][this.form] !== this.form) {
      this.lems.push( [this.exceptions[pos][this.form], pos] );
    }
  },

  // build array lemmas(this.lems) like [ [lemma1, "verb"], [lemma2, "noun"]... ]
  regular_bases: function(pos) {
    let bases = null;
    // bases -> [ [lemma1, lemma2, lemma3...], pos ]
    switch (pos){
      case 'verb':
        bases = this.possible_verb_bases();
        break;
      case 'noun':
        bases = this.possible_noun_bases();
        break;
      case 'adj':
        bases = this.possible_adj_adv_bases('adj');
        break;
      case 'adv':
        bases = this.possible_adj_adv_bases('adv');
        break;
      default:
        break;
    }
    if (bases) {
      this.check_lemmas(bases);
    }
  },

  // check if possible bases are include in lemma wordlists and push
  check_lemmas: function(bases) {
    let self = this;
    // bases -> [ [lemma1, lemma2, lemma3...], pos ]
    let lemmas = bases[0];
    let pos = bases[1];
    lemmas.forEach( function(lemma) {
      if ( self.wordlists[pos][lemma] && self.wordlists[pos][lemma] === lemma ) {
        self.lems.push( [lemma, pos] );
      }
    });
  },

  possible_verb_bases: function() {
    let form = this.form;
    let lemmas = [];

    if ( this.ends_with_es() ) {
      // goes -> go
      let verb_base = form.slice( 0, -2 );
      lemmas.push( verb_base );
      if ( !this.wordlists['verb'][verb_base] || this.wordlists['verb'][verb_base] !== verb_base ) {
        // opposes -> oppose
        lemmas.push( form.slice( 0, -1 ) );
      }
    } else if ( this.ends_with_verb_vowel_ys() ) {
      // annoys -> annoy
      lemmas.push( form.slice( 0, -1 ) );
    } else if ( form.endsWith('ed') && !form.endsWith('ied') && !form.endsWith('cked') ) {
      // saved -> save
      let past_base = form.slice( 0, -1 );
      lemmas.push( past_base );
      if ( !this.wordlists['verb'][past_base] || this.wordlists['verb'][past_base] !== past_base ) {
        // talked -> talk, but not push like coded -> cod
        lemmas.push( form.slice( 0, -2 ) );
      }
    } else if ( form.endsWith('ed') && this.double_consonant('ed') ) {
      // dragged -> drag
      lemmas.push( form.slice( 0, -3 ) );
      // added -> add
      lemmas.push( form.slice( 0, -2 ) );
      // pirouetted -> pirouette
      lemmas.push( form.slice( 0, -2 ) + 'e' );
    } else if ( form.endsWith('ing') && this.double_consonant('ing') ) {
      // dragging -> drag
      lemmas.push( form.slice( 0, -4 ) );
      // adding -> add
      lemmas.push( form.slice( 0, -3 ) );
      // pirouetting -> pirouette
      lemmas.push( form.slice( 0, -3 ) + 'e' );
    } else if ( form.endsWith('ing') && !this.exceptions['verb'][form] ) {
      // coding -> code
      let ing_base = form.slice( 0, -3 ) + 'e';
      lemmas.push( ing_base );
      if ( !this.wordlists['verb'][ing_base] || this.wordlists['verb'][ing_base] !== ing_base ) {
        // talking -> talk, but not push like coding -> cod
        lemmas.push( form.slice( 0, -3 ) );
      }
    } else if ( form.endsWith('able') && this.double_consonant('able') ) {
      lemmas.push( form.slice( 0, -5 ) );
    } else if ( form.endsWith('ability') && this.double_consonant('ability') ) {
      lemmas.push( form.slice( 0, -8 ) );
     } else if ( form.endsWith('s') ) {
      lemmas.push( form.slice( 0, -1 ) );
    }

    this.morphological_substitutions["verb"].forEach( function(entry) {
      let morpho = entry[0];
      let origin = entry[1];
      if ( form.endsWith(morpho) ) {
        lemmas.push( form.slice( 0, -(morpho.length) ) + origin );
      }
    });

    lemmas.push(form);

    return [ lemmas, 'verb' ];
  },

  possible_noun_bases: function() {
    let form = this.form;
    let lemmas = [];

    if ( this.ends_with_es() ) {
      // watches -> watch
      let noun_base = form.slice( 0, -2 );
      lemmas.push( noun_base );
      if ( !this.wordlists['noun'][noun_base] || this.wordlists['noun'][noun_base] !== noun_base ) {
        // horses -> horse
        lemmas.push( form.slice( 0, -1 ) );
      }
    } else if ( form.endsWith('s') ) {
      lemmas.push( form.slice( 0, -1 ) );
    }

    this.morphological_substitutions["noun"].forEach( function(entry) {
      let morpho = entry[0];
      let origin = entry[1];
      if ( form.endsWith(morpho) ) {
        lemmas.push( form.slice( 0, -(morpho.length) ) + origin );
      }
    });

    // to push a word like 'us' as it is
    lemmas.push(form);

    return [ lemmas, 'noun' ];
  },

  possible_adj_adv_bases: function(pos) {
    let form = this.form;
    let lemmas = [];

    if ( form.endsWith('est') && this.double_consonant('est') ) {
      // biggest -> big
      lemmas.push( form.slice( 0, -4 ) );
    } else if ( form.endsWith('er') && this.double_consonant('er') ) {
      // bigger -> bigger
      lemmas.push( form.slice( 0, -3 ) );
    }

    this.morphological_substitutions[pos].forEach( function(entry) {
      let morpho = entry[0];
      let origin = entry[1];
      if ( form.endsWith(morpho) ) {
        lemmas.push( form.slice( 0, -(morpho.length) ) + origin );
      }
    });

    // to push a word like 'after' as it is
    lemmas.push(form);

    return [ lemmas, pos ];
  },

  double_consonant: function(suffix) {
    // for like bigger -> big
    let form = this.form;
    // length after removing suffix from form
    let len = form.length - suffix.length;
    return this.is_vowel(form[len - 3]) && !this.is_vowel(form[len - 2]) && form[len - 2] === form[len - 1];
  },

  is_vowel: function(letter) {
    return ["a", "e", "i", "o", "u"].includes(letter);
  },

  // [ ["leave", "verb"], ["leaf", "noun"], ["leave", "verb"], ["leave", "noun"] ];
  // -> [ ["leave", "verb"], ["leaf", "noun"], ["leave", "noun"] ];
  uniq_lemmas: function(lemmas) {
    let u_lemmas = [];
    let len = lemmas.length;
    for (let i = 0; i < len; i++) {
      let val = lemmas[i];
      if (!this.is_include(u_lemmas, val) && val[0].length > 1) {
        u_lemmas.push(val);
      }
    }
    return u_lemmas;
  },

  is_include: function(lemmas, target) {
    let len = lemmas.length;
    for (let i = 0; i < len; i++) {
      if (lemmas[i][0] === target[0] && lemmas[i][1] === target[1]) {
        return true;
      }
    }
    return false;
  },

  ends_with_es: function() {
    let result = false;
    let form = this.form;
    let ends = ['ches', 'shes', 'oes', 'ses', 'xes', 'zes'];
    ends.forEach( function(end) {
      if ( form.endsWith(end) ) {
        result = true;
      }
    });
    return result;
  },

  ends_with_verb_vowel_ys: function() {
    let result = false;
    let form = this.form;
    let ends = ['ays', 'eys', 'iys', 'oys', 'uys'];
    ends.forEach( function(end) {
      if ( form.endsWith(end) ) {
        result = true;
      }
    });
    return result;
  }
};

let lemmatizer = new Lemmatizer();

module.exports = lemmatizer;