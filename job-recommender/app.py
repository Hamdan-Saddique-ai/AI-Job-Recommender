from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import json
from datetime import datetime
import os

app = Flask(__name__)

# Load jobs data
jobs_df = pd.read_csv('jobs.csv')

# Initialize vectorizer
vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))

# Prepare job features
def prepare_job_features():
    jobs_df['combined'] = jobs_df['title'] + ' ' + jobs_df['description'] + ' ' + jobs_df['skills_required'] + ' ' + jobs_df['category']
    tfidf_matrix = vectorizer.fit_transform(jobs_df['combined'])
    return tfidf_matrix

job_features = prepare_job_features()

class JobRecommender:
    def __init__(self):
        self.user_history = {}  # Store user search history
        
    def get_recommendations(self, skills, experience, interests, top_k=8):
        # Create user profile
        user_text = ' '.join(skills) + ' ' + ' '.join(interests)
        user_vector = vectorizer.transform([user_text])
        
        # Calculate similarities
        similarities = cosine_similarity(user_vector, job_features).flatten()
        
        # Adjust for experience
        if 'experience_required' in jobs_df.columns:
            exp_diff = np.abs(jobs_df['experience_required'].fillna(0) - experience)
            exp_score = 1 / (1 + exp_diff)
            similarities = similarities * exp_score
        
        # Get top recommendations
        top_indices = similarities.argsort()[-top_k:][::-1]
        recommendations = jobs_df.iloc[top_indices].copy()
        recommendations['match_score'] = similarities[top_indices] * 100
        
        # Add recommendation ID and save to history
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        return recommendations[['title', 'company', 'location', 'salary', 'match_score', 'description', 'skills_required', 'category']]
    
    def save_search_history(self, user_id, search_data, recommendations):
        if user_id not in self.user_history:
            self.user_history[user_id] = []
        
        self.user_history[user_id].append({
            'timestamp': datetime.now().isoformat(),
            'search': search_data,
            'recommendations_count': len(recommendations)
        })
        
        # Save to file
        with open(f'history_{user_id}.json', 'w') as f:
            json.dump(self.user_history[user_id], f)
    
    def get_user_history(self, user_id):
        history_file = f'history_{user_id}.json'
        if os.path.exists(history_file):
            with open(history_file, 'r') as f:
                return json.load(f)
        return []

recommender = JobRecommender()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        skills = data.get('skills', [])
        experience = int(data.get('experience', 0))
        interests = data.get('interests', [])
        user_id = data.get('user_id', 'anonymous')
        
        if not skills and not interests:
            return jsonify({'error': 'Please provide skills or interests'}), 400
        
        # Get recommendations
        recommendations = recommender.get_recommendations(skills, experience, interests)
        
        # Save to history
        recommender.save_search_history(user_id, data, recommendations)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations.to_dict('records'),
            'count': len(recommendations)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<user_id>', methods=['GET'])
def get_history(user_id):
    history = recommender.get_user_history(user_id)
    return jsonify({'history': history})

@app.route('/api/job-details/<int:job_id>', methods=['GET'])
def job_details(job_id):
    if job_id < len(jobs_df):
        job = jobs_df.iloc[job_id].to_dict()
        return jsonify({'job': job})
    return jsonify({'error': 'Job not found'}), 404

if __name__ == '__main__':
    print("🚀 AI Job Recommendation System Starting...")
    print("📊 Loaded", len(jobs_df), "jobs")
    print("🌐 Visit http://localhost:5000")
    app.run(debug=True, port=5000)