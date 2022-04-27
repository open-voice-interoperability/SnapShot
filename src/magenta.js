import { stringify } from "querystring";
import { decode } from 'html-entities';

const baseUrl = process.env.REACT_APP_BASE_URL;
const apiKey = process.env.REACT_APP_API_KEY;
const access_token = process.env.REACT_APP_MAGENTA_TOKEN || "";
const testing_secret = process.env.REACT_APP_TESTING_SECRET || "";

if (apiKey === undefined) {
    throw Error("Missing Magenta API key!");
}

function translate(text, from: text = "en", to: text = "de") {
    const key = process.env.REACT_APP_GOOGLE_API_KEY;
    const query = {
        "key": key,
        "source": from,
        "target": to,
        "q": text
    };
    return fetch(`https://translation.googleapis.com/language/translate/v2?${stringify(query)}`, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json; charset=utf-8",
        }
    }).then(response => response.json()).then(
        translation => {
            const { data: {translations: [{translatedText}]} } = translation;
            return decode(translatedText);
        }
    );
}

class ApiClient {

    token: string;

    constructor(baseURL, apiKey, token = "") {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
        this.token = token;
    }

    _test_login() {
        return fetch(`https://${this.baseURL}/user/api/v1/login?testing=true&secret=${testing_secret}`, {
            method: "POST",
            headers: {
                "ApiKey": this.apiKey,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "userId": crypto.randomUUID(),
            })
        }).then(response => response.json());
    }

    async send_text(text) {
        if (this.token === "") {
            return this._test_login().then(response => {
                this.token = response.token;
                return this.send_text(text);
            });
        }
        const translated = await translate(text);
        console.log(`🤖 Magenta -> ${translated}`);
        const url = `https://${this.baseURL}/cvi/dm/api/v1/invoke/text/json?intent=true&skill=true&sessionId=null`;
        const options = {
            method: "POST",
            headers: {
                "ApiKey": this.apiKey,
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.token}`,
            },
            body: JSON.stringify({
                "text": translated,
            })
        };
        const response = await fetch(url, options).then(r => r.json());
        return {
            text: await translate(response.text, "de", "en"),
            raw: response,
        };
    }
}

export default new ApiClient(baseUrl, apiKey, access_token);

