# [Twitch Chat Poll Visualizer](https://rascaltwo.github.io/Twitch-Chat-Poll-Visualizer/)

[![Website](https://img.shields.io/website?url=https%3A%2F%2Frascaltwo.github.io%2FTwitch-Chat-Poll-Visualizer%2F&label=Website)](https://rascaltwo.github.io/Twitch-Chat-Poll-Visualizer/)

Ever wanted to visualize Twitch chat-based polls? Well this is the application for you!

**Link to project:** https://rascaltwo.github.io/Twitch-Chat-Poll-Visualizer/

First go ahead and [download the chat of the VOD you wish to visualize](https://github.com/RascalTwo/TwitchVODChatDownloader), however you want, as long as the format is as Twitch stores them.

Then you can upload that `.JSON` to this application and customize the different answers.

After you've customized all the settings, you can hit save and copy the generated link to restore your settings!

https://user-images.githubusercontent.com/9403665/156878940-b72b7486-179f-4e02-9075-5c9b7ef969ce.mp4

https://user-images.githubusercontent.com/9403665/156878881-3a594626-15d8-4edb-bfdc-b2315c8e101c.mp4

https://user-images.githubusercontent.com/9403665/156878886-8c32b058-62da-4c1d-bb41-3393d78b3538.mp4

## How It's Made

**Tech Used:** HTML, CSS, JavaScript, [Chart.js](https://www.chartjs.org/)

With at least one chart type chosen, answers added, theme chosen, and playback settings set, the application will replay the chat and update the chosen chart(s) with the results, creating the subsequent animations. In addition all of these settings excluding the chat file is saved in the URL, allowing you to share your settings with others, or preserve them for later.

## Optimizations

While the codebase itself can be cleaned up, the next improvements are actually different chart types, such as word clouds, the automatic selection of contrasting text color based on the background color, ability to save the chart animation/result from within the browser, and finally the ability to rewind the animation.

## Lessons Learned

I primarily learned how to use Chart.js with quickly-changing dynamic data, in addition export and import input values to and from the URL.

## Settings

### Answers

`Color` and `Label` are self-explanatory, while `Keywords` is a shall-separated list of keywords that a message must contain to count towards an answer.

> `one "two three" four` has the keywords `['one', 'two three', 'four']`.

### Bins

Determines how often to make labels in the Line graph

### Rate

Seconds to play every second
