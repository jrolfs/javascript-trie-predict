/*jshint strict:true, undef:true, noarg:true, immed:true, trailing:true, expr:true, maxlen:120*/
/*global process: true, console:true, require:true, define:true*/

(function () {
    'use strict';


    // ---------- Dependencies ----------

    var fs = require('fs');


    // ---------- Variables ----------

    var usage = 'Usage: node predict.js [dictionary] [sequence]';
    var words = [];
    var sequence;

    var keyMap = {
        2: 'abc',
        3: 'def',
        4: 'ghi',
        5: 'jkl',
        6: 'mno',
        7: 'pqrs',
        8: 'tuv',
        9: 'xyz'
    };


    // Some basic CLI parameter validation

    if (process.argv.length < 4) {
        console.log('Dictionary and number sequence required, ' + usage);
        return;
    }

    sequence = parseInt(process.argv[3], 10);

    if (typeof(sequence) !== 'number' || isNaN(sequence)) {
        console.log('Sequence must be a valid number sequence');
        return;
    }


    // ---------- Build tree from dictionary file ----------

    function buildTree() {
        var tree = {};

        console.log('Building dictionary tree...');

        words.forEach(function (word) {
            var letters = word.split('');
            var leaf = tree;

            for (var i = 0; i < letters.length; i++) {
                var letter = letters[i].toLowerCase();
                var existing = leaf[letter];
                var last = (i === letters.length - 1);

                // If child leaf doesn't exist, create it
                if (typeof(existing) === 'undefined') {
                    // If we're at the end of the word, mark with number, don't create a leaf
                    leaf = leaf[letter] = last ? 1 : {};

                // If final leaf exists already
                } else if (typeof(existing) === 'number') {
                    // Increment end mark number, to account for duplicates
                    if (last) {
                        leaf[letter]++;

                    // Otherwise, if we need to continue, create leaf object with '$' marker
                    } else {
                        leaf = leaf[letter] = { $: existing };
                    }

                // If we're at the end of the word and at a leaf object with an
                // end '$' marker, increment the marker to account for duplicates
                } else if (typeof(existing) === 'object' && last) {
                    if (existing.hasOwnProperty('$')) {
                        existing.$++;
                    } else {
                        leaf[letter] = existing;
                        leaf[letter].$ = 1;
                    }

                // Just keep going
                } else {
                    leaf = leaf[letter];
                }
            }
        });

        console.log(JSON.stringify(tree));
        console.log('Complete.');
        return tree;
    }


    // ---------- Traverse tree with sequence ----------

    function findWords(sequence, tree, words, currentWord, depth) {

        var current = tree;
        
        sequence = sequence.toString();
        words = words || [];
        currentWord = currentWord || '';
        depth = depth || 0;

        for (var leaf in current) {
            var word = currentWord;
            var value = current[leaf];
            var key;

            if (leaf === '$') {
                key = sequence.charAt(depth - 1);
                if (depth >= sequence.length) {
                    words.push({word: word, occurrences: value, depth: depth, $: true});
                }
            } else {
                key = sequence.charAt(depth);
                word += leaf;
                if (depth + 1 >= sequence.length && typeof(value) === 'number') {
                    words.push({word: word, occurrences: value, depth: depth});
                }
            }

            // If we're still tracing the prefix and the leaf's value maps to our key
            if ((key && keyMap.hasOwnProperty(key) && keyMap[key].indexOf(leaf) > -1) || !key) {
                findWords(sequence, value, words, word, depth + 1);
            }
        }

        return words;
    }


    // ---------- Read dictionary file ----------

    // Read file from filesystem while splitting into words
    // TODO: implement some sort of buffered read if we need to handle much bigger files

    console.log('Reading dictionary file...');

    fs.readFile(process.argv[2], function (error, data) {
        
        if (error) {
            console.log(error + '\n');
            console.log('Error reading dictionary file, ' + usage);
            return;
        }

        words = data.toString();
        words = words.replace(/[:;!?",'\.\*\[\]\d\$]/g, '');
        words = words.replace(/\-\-/g, ' ');
        words = words.split(/\s+/g);

        console.log(words.join('\n'));

        console.log('Complete.');

        var tree = buildTree();
        console.log(findWords(sequence, tree));
    });

}());