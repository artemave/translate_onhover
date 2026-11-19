/* eslint-disable no-console */
import Dexie from 'dexie'

const db = new Dexie('transover_db')

db.version(1).stores({
  translations: '++id,word,source_language,target_language,reverse_translation,is_sentence,gt_resp,created_at'
})

function hasWhiteSpace(s) {
  return /\s/g.test(s)
}

function isSentence(word) {
  if (hasWhiteSpace(word) || word.length > 20) {
    return true
  }
  return false
}

export async function recordTranslation(word, sl, tl, isReverseTranslate, gtResponse) {
  console.debug('recordTranslation:', arguments)
  let id = await db.translations.add({
    word: word,
    source_language: sl,
    target_language: tl,
    reverse_translation: isReverseTranslate,
    is_sentence: isSentence(word),
    gt_resp: gtResponse,
    created_at: new Date().toISOString()
  })

  return id
}

export async function getTranslations() {
}


export async function getTranslationHistory() {
  return await db.translations.toArray()
}
