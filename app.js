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

    // Directly return the path if 'A' or 'I' is reached
    if (word === 'A' || word === 'I') {
        console.log(`Path completed with ${word}: ${[...path, word].join(' -> ')}`);
        return [...path, word];
    }

    // Special handling for two-letter words containing 'A' or 'I'
    if (word.length === 2 && (word.includes('A') || word.includes('I'))) {
        const finalLetter = word.includes('A') ? 'A' : 'I';
        console.log(`Path completed with ${finalLetter} from ${word}: ${[...path, word, finalLetter].join(' -> ')}`);
        return [...path, word, finalLetter];
    }

    // Iterate through all characters of the current word
    for (let i = 0; i < word.length; i++) {
        let subsequence = word.slice(0, i) + word.slice(i + 1);

        // Check if the subsequence is a valid word and not already in the path
        if (wordSet.has(subsequence) && !path.includes(subsequence)) {
            console.log(`Valid subsequence found from ${word}: ${subsequence}`);

            // Enqueue the new subsequence with its path
            let result = findValidSequence(subsequence, wordSet, [...path, word]);
            if (result.length) {
                return result; // Return the path if a valid sequence is found
            }
        }
    }

    // Log and return an empty array if no path to 'A' or 'I' is found
    console.log(`No valid path to 'A' or 'I' found from ${word}`);
    return [];
}


// Endpoint for uploading a wordlist and finding subsequences
app.post('/api/upload', upload.single('wordlist'), async (req, res) => {
    let wordList = [];
    const wordLength = parseInt(req.query.wordLength, 10); // Parse the wordLength parameter from the query string

    if (req.file) {
        // File was uploaded
        try {
            const filePath = req.file.path;
            const fileContent = await fs.readFile(filePath, 'utf-8');
            wordList = fileContent.split(/\r?\n/);
            await fs.remove(filePath); // Clean up the uploaded file
        } catch (error) {
            console.error(`Error processing uploaded file: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    } else if (req.body.url) {
        // URL is provided in the request body
        try {
            const response = await axios.get(req.body.url);
            wordList = response.data.split(/\r?\n/);
        } catch (error) {
            console.error(`Error fetching file from URL: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch file from URL: ${error.message}` });
        }
    } else {
        // Neither file nor URL is provided
        return res.status(400).json({ error: 'No wordlist file uploaded or URL provided.' });
    }

    // Process the word list
    const wordSet = new Set(wordList);
    const validSequences = {};

    wordList.forEach(word => {
        if (word.length === wordLength) { // Only process words of the specified length
            console.log(`Checking word: ${word}`);
            let sequence = findValidSequence(word, wordSet);
            if (sequence.length > 0) {
                validSequences[word] = sequence;
            }
        }
    });

    res.json({ validSequences });
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
