let currentRecommendations = [];

async function getRecommendations() {
    const skills = document.getElementById('skills').value;
    const experience = document.getElementById('experience').value;
    const interests = document.getElementById('interests').value;
    const userId = document.getElementById('user_id').value;
    
    if (!skills && !interests) {
        alert('Please enter at least your skills or interests!');
        return;
    }
    
    // Show loading
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    
    // Prepare data
    const requestData = {
        skills: skills.split(',').map(s => s.trim()),
        experience: parseInt(experience),
        interests: interests.split(',').map(i => i.trim()).filter(i => i),
        user_id: userId
    };
    
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentRecommendations = data.recommendations;
            displayRecommendations(data.recommendations);
            loadHistory(userId);
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to get recommendations. Please try again.');
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

function displayRecommendations(recommendations) {
    const jobsList = document.getElementById('jobsList');
    const results = document.getElementById('results');
    const resultCount = document.getElementById('resultCount');
    
    if (!recommendations || recommendations.length === 0) {
        jobsList.innerHTML = '<p style="text-align: center; padding: 40px;">No matching jobs found. Try different skills!</p>';
        resultCount.textContent = '0';
    } else {
        resultCount.textContent = recommendations.length;
        
        jobsList.innerHTML = recommendations.map(job => `
            <div class="job-card" onclick="showJobDetails(${JSON.stringify(job).replace(/"/g, '&quot;')})">
                <div class="job-title">${escapeHtml(job.title)}</div>
                <div class="company">
                    <i class="fas fa-building"></i> ${escapeHtml(job.company)}
                </div>
                <div class="job-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location)}</span>
                    <span><i class="fas fa-dollar-sign"></i> ${escapeHtml(job.salary)}</span>
                </div>
                <div class="job-details">
                    <span><i class="fas fa-tag"></i> ${escapeHtml(job.category)}</span>
                </div>
                <p style="font-size: 14px; color: #666; margin: 10px 0;">
                    ${escapeHtml(job.description.substring(0, 100))}...
                </p>
                <div class="skills">
                    ${job.skills_required.split(',').slice(0, 4).map(skill => 
                        `<span class="skill-tag">${escapeHtml(skill.trim())}</span>`
                    ).join('')}
                </div>
                <div class="match-score">
                    <i class="fas fa-percent"></i> ${Math.round(job.match_score)}% Match
                </div>
            </div>
        `).join('');
    }
    
    results.classList.remove('hidden');
}

function showJobDetails(job) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <h2 style="color: #333;">${escapeHtml(job.title)}</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #667eea;">${escapeHtml(job.company)}</strong>
            </div>
            <div style="margin-bottom: 15px; color: #666;">
                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.location)} | 
                <i class="fas fa-dollar-sign"></i> ${escapeHtml(job.salary)}
            </div>
            <div style="margin-bottom: 20px;">
                <strong>Description:</strong>
                <p style="margin-top: 10px; line-height: 1.6;">${escapeHtml(job.description)}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <strong>Required Skills:</strong>
                <div class="skills" style="margin-top: 10px;">
                    ${job.skills_required.split(',').map(skill => 
                        `<span class="skill-tag">${escapeHtml(skill.trim())}</span>`
                    ).join('')}
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <strong>Match Score:</strong>
                <div class="match-score" style="margin-top: 10px;">
                    ${Math.round(job.match_score)}% Match
                </div>
            </div>
            <button onclick="this.closest('.modal').remove()" class="btn-primary" style="width: 100%;">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function loadHistory(userId) {
    try {
        const response = await fetch(`/api/history/${userId}`);
        const data = await response.json();
        
        const historyList = document.getElementById('historyList');
        if (data.history && data.history.length > 0) {
            historyList.innerHTML = data.history.map(item => `
                <div class="history-item">
                    <strong>${new Date(item.timestamp).toLocaleString()}</strong><br>
                    Skills: ${item.search.skills.join(', ')}<br>
                    Found: ${item.recommendations_count} matches
                </div>
            `).join('');
        } else {
            historyList.innerHTML = '<p style="text-align: center; padding: 20px;">No search history yet</p>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function clearResults() {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('skills').value = '';
    document.getElementById('interests').value = '';
}

function toggleHistory() {
    const historyContent = document.getElementById('historyContent');
    const icon = document.getElementById('historyIcon');
    
    historyContent.classList.toggle('hidden');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
    
    // Load history if visible
    if (!historyContent.classList.contains('hidden')) {
        const userId = document.getElementById('user_id').value;
        loadHistory(userId);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load history on page load
window.onload = () => {
    const userId = document.getElementById('user_id').value;
    loadHistory(userId);
};