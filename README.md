# Twitch Chat Poll Visualizer

Ever wanted to visualize Twitch chat-based polls? Well this is the application for you!

First go ahead and [download the chat of the VOD you wish to visualize](https://github.com/RascalTwo/TwitchVODChatDownloader), however you want, as long as the format is as Twitch stores them.

Then you can upload that `.JSON` to this application and customize the different answers.

After you've customized all the settings, you can hit save and copy the generated link to restore your settings!

## Settings

### Answers

`Color` and `Label` are self-explanatory, while `Keyworks` is a shall-seperated list of keywords that a message must contain to count towards an answer.

> `one "two three" four` has the keywords `['one', 'two three', 'four']`.

### Bins

Determines how often to make labels in the Line graph

### Rate

Seconds to play every second

## Dependencies

- [Chart.js](https://www.chartjs.org/)
- [chartjs-plugin-datalabels](https://chartjs-plugin-datalabels.netlify.app/)
- [node-shlex](https://github.com/rgov/node-shlex)