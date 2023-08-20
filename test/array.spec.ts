import mock from '../src/index'

describe('mock array', () => {
  test('\'name|count\': array', async () => {
    const result = mock.gen({
      'arr|3': [{
        'string|1-3': '*',
      }],
    })
    expect(result.arr.length).toBe(3)
  })
})
