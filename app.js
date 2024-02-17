const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const axios = require('axios');
const cheerio = require('cheerio');
const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

// Endpoint for uploading a wordlist and finding subsequences
app.post('/api/upload', upload.single('wordlist'), async (req, res) => {
    const wordLength = parseInt(req.query.wordLength, 10);

    try {
        const filePath = req.file.path;
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const wordList = fileContent.split(/\r?\n/);
        const wordSet = new Set(wordList);
        const validWords = {};

        wordList.forEach(word => {
            if (word.length === wordLength) {
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

// Updated endpoint to accept a file and a URL
app.post('/api/crawl', upload.single('wordlist'), async (req, res) => {
    const url = req.body.url; // URL from form field

    if (!req.file) {
        return res.status(400).json({ error: 'No wordlist file uploaded.' });
    }
    if (!url) {
        return res.status(400).json({ error: 'No URL provided.' });
    }

    try {
        // Process the uploaded wordlist
        const wordListPath = req.file.path;
        const wordListContent = await fs.readFile(wordListPath, 'utf-8');
        const wordList = wordListContent.split(/\r?\n/);
        const wordSet = new Set(wordList.map(word => word.toUpperCase())); // Ensure wordSet is uppercase

        // Crawl the website and extract words
        const response = await axios.get(url);
        const html = response.data;
        const crawledWords = extractWords(html).map(word => word.toUpperCase()); // Convert crawled words to uppercase

        // Compare crawled words against the wordlist
        const validWords = {};

        crawledWords.forEach(word => {
            const subsequences = findValidSubsequences(word, wordSet);
            if (subsequences.length > 0) {
                validWords[word] = subsequences;
            }
        });

        await fs.remove(wordListPath); // Clean up the uploaded wordlist file
        res.json({ validWords });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function findValidSubsequences(word, wordSet) {
    const subsequences = new Set();

    for (let i = 1; i < (1 << word.length); i++) {
        let subsequence = '';
        for (let j = 0; j < word.length; j++) {
            if (i & (1 << j)) {
                subsequence += word[j];
            }
        }
        if (subsequence !== word && wordSet.has(subsequence)) {
            subsequences.add(subsequence);
        }
    }

    return Array.from(subsequences);
}

function extractWords(html) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    const words = text.match(/\b(\w+)\b/g);
    return [...new Set(words)];
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
