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
                if (Object.keys(subsequences).length > 0) { // Check if any subsequences were found
                    validWords[word] = subsequences; // Store the found subsequences for this word
                }
            }
        });

        await fs.remove(filePath);
        res.json({ validWords }); // Make sure validWords is returned here
    } catch (error) {
        console.error(error); // Log the error for debugging
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
    const validSubsequences = {};
    const minLength = word.includes('A') || word.includes('I') ? 1 : 2;

    console.log(`Processing word: ${word}`);

    // Iterate over the desired lengths
    for (let length = word.length - 1; length >= minLength; length--) {
        let found = false;

        // Generate subsequences of the current length
        for (let i = 0; i < (1 << word.length); i++) {
            if (found) break; // Stop if we've already found a subsequence of this length
            let subsequence = '';

            for (let j = 0; j < word.length; j++) {
                if (i & (1 << j)) {
                    subsequence += word[j];
                }
            }

            if (subsequence.length === length && wordSet.has(subsequence)) {
                console.log(`Found valid subsequence of length ${length}: ${subsequence}`);
                validSubsequences[length] = subsequence; // Store the first valid subsequence of this length
                found = true; // Mark as found to stop further searches for this length
            }
        }
    }

    // Check and add 'A' or 'I' if applicable
    if (word.includes('A') && wordSet.has('A')) {
        validSubsequences[1] = 'A';
        console.log("Added 'A' as a valid subsequence");
    } else if (word.includes('I') && wordSet.has('I')) {
        validSubsequences[1] = 'I';
        console.log("Added 'I' as a valid subsequence");
    }

    return validSubsequences;
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
