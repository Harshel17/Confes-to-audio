const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const mongoose = require('mongoose');
const util = require('util');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (e.g., audio)

const ttsClient = new TextToSpeechClient({ keyFilename: './key.json' });

mongoose.connect('mongodb://admin:password123@localhost:27017/storyDB?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

const storySchema = new mongoose.Schema({
    title: String,
    content: String,
    audioPath: String,
});
const Story = mongoose.model('Story', storySchema);

app.post('/submit-story', async (req, res) => {
    const { title, content } = req.body;

    try {
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text: content },
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        });

        const audioFileName = `audio-${Date.now()}.mp3`;
        const audioPath = `public/audio/${audioFileName}`;
        await util.promisify(fs.writeFile)(audioPath, response.audioContent);

        const story = new Story({ title, content, audioPath: `/audio/${audioFileName}` });
        await story.save();

        res.json({ message: 'Story submitted successfully!', story });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process story' });
    }
});

app.get('/stories', async (req, res) => {
    const stories = await Story.find();
    res.json(stories);
});

app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000');
});
