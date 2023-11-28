// components/QuestionPrompt.vue
<template>
  <div class="site-container">
    <button @click="fetchQuestion" v-if="!loading && !question" class="btn-show-question">Would You Rather...</button>
    <div v-if="loading" class="loading">Loading...</div>
    <div v-if="question" class="question-box-start">
      <div class="question-image-container">
        <img v-if="question.imageUrl" :src="question.imageUrl" alt="Related Image" class="question-image" />
        <div class="question-text-overlay">
          <button @click="fetchQuestion" v-if="!loading" class="btn-show-question">Would You Rather...</button>
          <h1 class="question-text">{{ question.question }}</h1>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import axios from 'axios';

const UNSPLASH_API_KEY = process.env.VUE_APP_API_KEY_UNSPLASH;
const RAPID_API_KEY = process.env.VUE_APP_API_KEY_RAPIDAPI;
const API_GATEWAY_ENDPOINT = process.env.VUE_APP_API_GATEWAY_ENDPOINT;

export default {
  data() {
    return {
      loading: false,
      question: null
    };
  },
  computed: {
    currentQuestion() {
      return this.question;
    }
  },
  methods: {
    async fetchQuestion() {
      this.loading = true;
      try {
        const response = await axios.get('https://would-you-rather.p.rapidapi.com/wyr/random', {
          headers: {
            'X-RapidAPI-Key': RAPID_API_KEY,
            'X-RapidAPI-Host': 'would-you-rather.p.rapidapi.com',
          },
        });
        const questionData = response.data[0]; // Access the first element in the array

        // Fetch an image related to the question text from Unsplash
        const imageUrl = await this.fetchRelatedImage(questionData.question);

        // Set the question and image data
        this.question = { id: Date.now().toString(), ...questionData, imageUrl };
        this.loading = false;
      } catch (error) {
        console.error(error);
        this.loading = false;
      }
      // Call the Lambda function to save the question to DynamoDB
      await this.saveQuestionToDynamoDB(this.question);
    },
    async fetchRelatedImage(query) {
      try {
        const response = await axios.get(`https://api.unsplash.com/search/photos?query=${query}`, {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_API_KEY}`,
          },
        });
        if (response.data.results.length > 0) {
          return response.data.results[0].urls.regular; // Use the URL of the first image
        }
        return ''; // Return an empty string if no image is found
      } catch (error) {
        console.error('Error fetching image:', error);
        return ''; // Return an empty string on error
      }
    },
    async saveQuestionToDynamoDB(question) {
      try {
        console.log('Saving question:', JSON.stringify(question))

        console.log('API_GATEWAY_ENDPOINT:', API_GATEWAY_ENDPOINT)
        const response = await fetch(API_GATEWAY_ENDPOINT, {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(question),
        });

        if (response.ok) {
          console.log('Question saved successfully!');
        } else {
          console.error('Failed to save question:', response.statusText);
        }
      } catch (error) {
        console.error('Error saving question:', error);
      }
    },
  },
};
</script>

<style scoped>
.site-container {
  background: linear-gradient(to bottom, #000000, #222222);
  color: white;
  padding: 20px;
  text-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn-show-question {
  background-color: royalblue;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-show-question:hover {
  background-color: green;
}

.loading {
  font-size: 18px;
  color: silver;
  margin: 20px 0;
}

.question-box-start {
  padding: 0; /* Remove padding to cover the whole screen */
  margin: 0; /* Remove margin */
  animation: fadeIn 1s;
}

.question-image-container {
  position: relative;
  overflow: hidden;
}

.question-image {
  width: 100vw; /* Set the width to cover the whole screen width */
  height: 100vh; /* Set the height to cover the whole screen height */
  object-fit: cover; /* Maintain aspect ratio while covering the whole screen */
}

.question-text-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 36px;
  text-align: center;
  padding: 20px;
}

.question-text {
  color: white;
  text-align: center;
  font-size: 4vw;
  padding-left: 20%;
  padding-right: 20%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>