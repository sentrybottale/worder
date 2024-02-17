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

    try {
        const filePath = req.file.path;
        const fileContent = await fs.readFile(filePath, 'utf-8');
        // Filter words to include only those of the desired length and shorter
        const wordList = fileContent.split(/\r?\n/).filter(word => word.length <= wordLength);
        const wordSet = new Set(wordList); // Use a Set for efficient lookup
        const validWords = {};

        wordList.forEach(word => {
            if (word.length === wordLength) {
                // For each word of the desired length, find its valid subsequences
                const subsequences = findValidSubsequences(word, wordSet);
                if (subsequences.length > 0) {
                    validWords[word] = subsequences;
                }
            }
        });

        await fs.remove(filePath);

        res.json({ validWords });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function findValidSubsequences(word, wordSet) {
    const subsequences = [];

    // Check each word in the set to see if it's a subsequence of the original word
    wordSet.forEach(subWord => {
        if (subWord.length < word.length && isSubsequence(subWord, word)) {
            subsequences.push(subWord);
        }
    });

    return subsequences;
}


// Helper function to check if the first word is a subsequence of the second
function isSubsequence(subWord, word) {
    if (subWord.length === 1) {
        return word.includes(subWord);
    }

    let i = 0, j = 0;
    while (i < subWord.length && j < word.length) {
        if (subWord[i] === word[j]) {
            i++;
        }
        j++;
    }
    return i === subWord.length;
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
