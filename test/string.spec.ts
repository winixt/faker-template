import mock from '../src/index'

describe('mock string', () => {
  test('\'name|min-max\': string', async () => {
    const result = mock.gen({
      'string|1-3': '★',
    })
    expect(result).toMatchObject({
      string: expect.stringMatching(/^★{1,3}$/),
    })
  })
  test('\'name|count\': string', async () => {
    const result = mock.gen({
      'string|3': '★',
    })
    expect(result).toEqual({
      string: '★★★',
    })
  })

  test('random: string', async () => {
    const result = mock.gen({
      'string|3': '',
    })
    expect(result.string.length).toBe(3)
  })
})
