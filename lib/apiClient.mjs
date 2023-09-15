function regexp_escape (s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export function generateUrls(word, { sl, tl }) {
  const encoded = `sl=${sl}&tl=${tl}&q=${encodeURIComponent(word.trim())}`
  const urls = [
    `https://clients5.google.com/translate_a/single?dj=1&dt=t&dt=sp&dt=ld&dt=bd&client=dict-chrome-ex&${encoded}`,
    `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd&dj=1&source=input&${encoded}`,
  ]
  return urls
}

function translationIsTheSameAsInput(sentences, input) {
  return sentences[0].trans.match(new RegExp(regexp_escape(input.trim()), 'i'))
}

export function parseResponse(data, word) {
  let parsed, succeeded, sl

  if ((!data.dict && !data.sentences) || (!data.dict && translationIsTheSameAsInput(data.sentences, word))) {
    succeeded = false
  } else {
    succeeded = true

    parsed = []
    if (data.dict) { // full translation
      data.dict.forEach(function(t) {
        const translationItem = {
          pos: t.pos,
          meanings: t.entry.map(e => {
            if (e.previous_word) {
              if (e.previous_word.match(/'$/)) {
                return `${e.previous_word}${e.word}`
              } else {
                return `${e.previous_word} ${e.word}`
              }
            }
            return e.word
          })
        }
        parsed.push(translationItem)
      })
    } else { // single word or sentence(s)
      data.sentences.forEach(function(s) {
        parsed.push(s.trans)
      })
      parsed = parsed.join(' ')
    }
    sl = data.src
  }

  return { succeeded, sl, parsed }
}
