const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const axios = require('axios');
const cheerio = require('cheerio');
const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(express.json());

// Recursive function to find valid sequence of words leading to 'A' or 'I'
function findValidSequence(word, wordSet, path = []) {
    console.log(`Processing: ${word}, Current Path: ${path.join(' -> ')}`);

    // Base case: if the current word is 'A' or 'I', return the path including this word
    if (word === 'A' || word === 'I') {
        console.log(`Base case reached with ${word}`);
        return [...path, word];
    }

    // Iterate through all characters of the current word to generate subsequences
    for (let i = 0; i < word.length; i++) {
        let subsequence = word.slice(0, i) + word.slice(i + 1);

        // Check if the subsequence is a valid word and not already in the path
        if (wordSet.has(subsequence) && !path.includes(subsequence)) {
            console.log(`Valid subsequence found: ${subsequence} from ${word}`);
            let result = findValidSequence(subsequence, wordSet, [...path, word]); // Recurse with the subsequence
            if (result.length) {
                console.log(`Valid path found for ${word}: ${result.join(' -> ')}`);
                return result; // Return the valid path if found
            }
        }
    }

    // If no valid path is found from this word, log and return an empty array
    console.log(`No valid path found from ${word}`);
    return [];
}

// Endpoint for uploading a wordlist and finding subsequences
app.post('/api/upload', upload.single('wordlist'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const wordList = fileContent.split(/\r?\n/);
        const wordSet = new Set(wordList);
        const validSequences = {};

        wordList.forEach(word => {
            console.log(`Checking word from upload: ${word}`);
            let sequence = findValidSequence(word, wordSet);
            if (sequence.length > 0) {
                validSequences[word] = sequence;
            }
        });

        await fs.remove(filePath);
        res.json({ validSequences });
    } catch (error) {
        console.error(`Error processing /api/upload: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint for crawling words from a given URL and comparing against a provided wordlist
app.post('/api/crawl', upload.single('wordlist'), async (req, res) => {
    const url = req.body.url;

    if (!req.file) {
        return res.status(400).json({ error: 'No wordlist file uploaded.' });
    }
    if (!url) {
        return res.status(400).json({ error: 'No URL provided.' });
    }

    try {
        const wordListPath = req.file.path;
        const wordListContent = await fs.readFile(wordListPath, 'utf-8');
        const wordList = wordListContent.split(/\r?\n/).map(word => word.toUpperCase());
        const wordSet = new Set(wordList);

        const response = await axios.get(url);
        const html = response.data;
        const crawledWords = extractWords(html);
        const validSequences = {};

        crawledWords.forEach(word => {
            console.log(`Checking crawled word: ${word}`);
            let sequence = findValidSequence(word, wordSet);
            if (sequence.length > 0) {
                validSequences[word] = sequence;
            }
        });

        await fs.remove(wordListPath);
        res.json({ validSequences });
    } catch (error) {
        console.error(`Error processing /api/crawl: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Function to extract words from HTML content
function extractWords(html) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    const words = text.replace(/[\s\r\n]+/g, ' ').split(' ').map(word => word.toUpperCase()).filter(word => word.length > 1 && /^[A-Z]+$/i.test(word));
    return [...new Set(words)];
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
