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

// Endpoint for crawling words from a given URL and comparing against a provided wordlist
app.post('/api/crawl', upload.single('wordlist'), async (req, res) => {
    const url = req.body.url;
    const wordLength = parseInt(req.body.wordLength, 10); // Retrieve wordLength from request body

    if (!req.file) {
        return res.status(400).json({ error: 'No wordlist file uploaded.' });
    }
    if (!url) {
        return res.status(400).json({ error: 'No URL provided.' });
    }
    if (isNaN(wordLength) || wordLength <= 0) {
        return res.status(400).json({ error: 'Invalid or missing wordLength parameter.' });
    }

    try {
        // Process the uploaded wordlist
        const wordListPath = req.file.path;
        const wordListContent = await fs.readFile(wordListPath, 'utf-8');
        const wordSet = new Set(wordListContent.split(/\r?\n/).map(word => word.toUpperCase()));

        // Crawl the website and extract words
        const response = await axios.get(url);
        const html = response.data;
        const crawledWords = extractWords(html).filter(word => word.length === wordLength);

        // Compare crawled words against the provided wordlist
        const validWords = {};
        crawledWords.forEach(word => {
            if (wordSet.has(word)) {
                const subsequences = findValidSubsequences(word, wordSet);
                if (subsequences.length > 0) {
                    validWords[word] = subsequences;
                }
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
    const containsA = word.includes('A');
    const containsI = word.includes('I');

    // Generate subsequences for combinations of characters
    for (let i = 1; i < (1 << word.length); i++) {
        let subsequence = '';

        for (let j = 0; j < word.length; j++) {
            if (i & (1 << j)) {
                subsequence += word[j];
            }
        }

        // Add the subsequence if it's different from the original word, is in the wordSet,
        // and if the original word contains 'A' or 'I', the subsequence must also contain them
        if (subsequence !== word && wordSet.has(subsequence) &&
            (!containsA || subsequence.includes('A')) && 
            (!containsI || subsequence.includes('I'))) {
            subsequences.add(subsequence);
        }
    }

    // Directly add 'A' and 'I' if applicable and present in the wordSet
    if (containsA && wordSet.has('A')) subsequences.add('A');
    if (containsI && wordSet.has('I')) subsequences.add('I');

    return Array.from(subsequences);
}



function extractWords(html) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    const words = text
        .replace(/[\s\r\n]+/g, ' ') // Replace multiple whitespace characters with a single space
        .split(' ') // Split by space to get words
        .map(word => word.toUpperCase()) // Convert words to uppercase
        .filter(word => word.length > 1 && /^[A-Z]+$/i.test(word)); // Filter out single characters and non-alphabetic strings

    return [...new Set(words)]; // Return unique words
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
