const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('wordlist'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const wordLength = parseInt(req.query.wordLength, 10);
    const startsWith = req.query.startsWith || ''; // Parameter to filter target words

    try {
        const filePath = req.file.path;
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const allWords = fileContent.split(/\r?\n/).filter(word => word.length <= wordLength);
        const wordSet = new Set(allWords); // Contains all words up to the specified length
        const targetWords = allWords.filter(word => word.length === wordLength && word.startsWith(startsWith)); // Target words filtered by length and startsWith
        const validWords = {};

        targetWords.forEach(word => {
            const subsequences = findValidSubsequences(word, wordSet);
            if (subsequences.length > 0) {
                validWords[word] = subsequences;
            }
        });

        await fs.remove(filePath);

        res.json({ validWords });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function findValidSubsequences(word, wordSet) {
    const subsequences = new Set();

    // Check for single-letter subsequences
    for (let i = 0; i < word.length; i++) {
        if (wordSet.has(word[i])) {
            subsequences.add(word[i]);
        }
    }

    // Generate all other subsequences
    for (let i = 1; i < (1 << word.length); i++) {
        let subsequence = '';

        for (let j = 0; j < word.length; j++) {
            if (i & (1 << j)) {
                subsequence += word[j];
            }
        }

        if (subsequence.length > 1 && wordSet.has(subsequence) && subsequence !== word) {
            subsequences.add(subsequence);
        }
    }

    return Array.from(subsequences);
}


function isSubsequence(subWord, word) {
    let i = 0, j = 0;
    while (i < subWord.length && j < word.length) {
        if (subWord[i] === word[j]) {
            i++;
            j++;
        } else {
            j++;
        }
    }
    return i === subWord.length;
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
