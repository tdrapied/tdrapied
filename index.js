const fs = require('fs');
const Mustache = require('mustache');
const template = fs.readFileSync('./template/template.mustache', 'utf8');
require('dotenv').config();

class Strava {
  token = null;

  async getStats(userId) {
    const response = await fetch(`https://www.strava.com/api/v3/athletes/${userId}/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      }
    });

    if (!response || response.status !== 200) {
      throw new Error('Error getting Strava stats');
    }

    return response.json();
  }

  async setToken() {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      })
    });

    if (!response || response.status !== 200) {
      throw new Error('Error getting Strava token');
    }

    const json = await response.json();
    this.token = json.access_token;
  }
}

class Utils {
  getAge(date) {
    const birthday = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    return age;
  }
}

const main = async () => {
  const utils = new Utils();
  const age = utils.getAge(process.env.BIRTHDAY);

  const strava = new Strava();
  await strava.setToken();

  // Get stats
  const stats = await strava.getStats(process.env.STRAVA_USER_ID);
  const rideActivities = stats?.all_ride_totals?.count;
  let rideDistance = stats?.all_ride_totals?.distance;
  if (!rideActivities || !rideDistance) {
    throw new Error('Riding kms not valid');
  }

  // Convert to km
  rideDistance = Math.floor(rideDistance / 100) / 10;

  const view = {
    age,
    ride: {
      activities: rideActivities,
      distance: rideDistance
    }
  };

  const customTags = [ '<%', '%>' ];
  const output = Mustache.render(template, view, {}, customTags);

  // Create a new file with the output
  fs.writeFileSync('README.md', output);
  
  console.log('Success!');
}

main().catch((err) => {
  throw err;
});
