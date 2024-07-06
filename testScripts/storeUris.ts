const exampleUri =
  // "bafybeif2iaewojwxsff7j52j673x6b3ql5kghoftvgfmop3vka3gkjqrbq"; // channel
  'bafybeiguzbqbgr7fslkza4w2ycsrkiuvmgqt5sh5q6hujykuorawq4nlbu' // item

async function storeUris(uris: string[]): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/updateUriBatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris }),
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('URIs stored successfully:', result)
  } catch (error) {
    console.error('Error storing URIs:', error)
  }
}

await storeUris([exampleUri])
