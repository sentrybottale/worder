const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const axios = require('axios');
const cheerio = require('cheerio');
const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(express.json());

function findValidSequence(word, wordSet) {
    let sequences = [word];
    let currentWords = [word];

    while (currentWords.length > 0) {
        let newCurrentWords = [];

        for (let currentWord of currentWords) {
            let foundSubsequence = false;

            for (let i = 0; i < currentWord.length; i++) {
                let subsequence = currentWord.slice(0, i) + currentWord.slice(i + 1);

                if (wordSet.has(subsequence)) {
                    console.log(`Valid subsequence found for ${currentWord}: ${subsequence}`);
                    if (!sequences.includes(subsequence)) {
                        sequences.push(subsequence);
                        newCurrentWords.push(subsequence);
                        foundSubsequence = true;
                    }
                }
            }

            if (!foundSubsequence && currentWord.length === 1 && (currentWord === 'A' || currentWord === 'I')) {
                console.log(`Final valid single letter found: ${currentWord}`);
                return sequences;
            }
        }

        if (!newCurrentWords.length) {
            console.log(`No further valid subsequences found.`);
            return [];
        }

        currentWords = newCurrentWords;
    }

    console.log(`No path to 'A' or 'I' found.`);
    return [];
}


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

function extractWords(html) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    const words = text.replace(/[\s\r\n]+/g, ' ').split(' ').map(word => word.toUpperCase()).filter(word => word.length > 1 && /^[A-Z]+$/i.test(word));
    return [...new Set(words)];
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
