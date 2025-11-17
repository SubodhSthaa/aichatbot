        if (text.length > 300) {
          const shortText = text.slice(0, 300);
          displayText = `${shortText}...<span class="show-more" onclick="expandMessage(this, \`${fullText
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$")}\`, \`${shortText
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$")}\`)">Show more</span>`;
        }
