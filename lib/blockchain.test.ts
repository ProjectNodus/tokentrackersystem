import { describe, it, expect } from 'vitest'
import { decodeTokenCreationData, determineTransactionType } from './blockchain'
import { encodeAbiParameters } from 'viem'

// Helper to build transaction input
function buildInput(methodId: string, params: any[], types: {name:string,type:string}[]) {
  const encoded = encodeAbiParameters(types, params)
  return methodId + encoded.slice(2)
}

describe('decodeTokenCreationData', () => {
  it('decodes original token creation format', () => {
    const methodId = '0x0b8c6fec'
    const types = [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'taxPercentage', type: 'uint256' },
    ]
    const params = ['My Token', 'MYT', 1000n, 10n]
    const input = buildInput(methodId, params, types)
    const result = decodeTokenCreationData(methodId, input)
    expect(result).toEqual({ name: 'My Token', symbol: 'MYT', totalSupply: '1000' })
  })

  it('decodes new token creation format', () => {
    const methodId = '0x30f51a46'
    const types = [
      { name: 'param1', type: 'uint16' },
      { name: 'param2', type: 'uint8' },
      { name: 'param3', type: 'uint128' },
      { name: 'param4', type: 'uint8' },
      { name: 'creator', type: 'address' },
      { name: 'param6', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
    ]
    const params = [1n, 2n, 3n, 4n, '0x1111111111111111111111111111111111111111', 5n, 'New Token', 'NTK', 5000n]
    const input = buildInput(methodId, params, types)
    const result = decodeTokenCreationData(methodId, input)
    expect(result).toEqual({ name: 'New Token', symbol: 'NTK', totalSupply: '5000', creator: '0x1111111111111111111111111111111111111111' })
  })

  it('returns null for unknown method', () => {
    const result = decodeTokenCreationData('0xdeadbeef', '0x')
    expect(result).toBeNull()
  })
})

describe('determineTransactionType', () => {
  it('uses known signature', () => {
    const res = determineTransactionType('0xa6f2ae3a', '0')
    expect(res).toEqual({ type: 'BUY', description: 'Buy tokens with AVAX', method: 'buy' })
  })

  it('detects create/token keywords', () => {
    const res = determineTransactionType('0xdeadcreate', '0')
    expect(res).toEqual({ type: 'TOKEN_CREATION', description: 'Possible token creation', method: 'unknown_create' })
  })

  it('detects value transfer as buy', () => {
    const res = determineTransactionType('0xabcdef01', '1000000000000000000') // 1 AVAX
    expect(res).toEqual({ type: 'BUY', description: 'Buy transaction (AVAX sent)', method: 'unknown_buy' })
  })

  it('returns unknown otherwise', () => {
    const res = determineTransactionType('0xabcdef01', '0')
    expect(res).toEqual({ type: 'UNKNOWN', description: 'Unknown transaction type', method: '0xabcdef01' })
  })
})
