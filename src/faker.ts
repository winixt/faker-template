import { Faker, base, en, zh_CN } from '@faker-js/faker'

export const faker = new Faker({
  locale: [zh_CN, en, base],
})
