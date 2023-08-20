import mock from '../src/index'

describe('mock number', () => {
  test('\'name|min-max\': number', async () => {
    const result = mock.gen({
      'number|1-3': 2,
    })
    expect([1, 2, 3].includes(result.number)).toBe(true)
  })
})
