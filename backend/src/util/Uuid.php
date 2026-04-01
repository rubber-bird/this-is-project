<?php

class Uuid
{
    /** Generate a UUIDv7 string — time-ordered, sortable. */
    public static function generate(): string {
        $ms    = (int) (microtime(true) * 1000);
        $tsHex = str_pad(dechex($ms), 12, '0', STR_PAD_LEFT);
        $rand  = random_bytes(10);
        $rand[0] = chr((ord($rand[0]) & 0x0f) | 0x70);
        $rand[2] = chr((ord($rand[2]) & 0x3f) | 0x80);
        $hex = $tsHex . bin2hex($rand);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split($hex, 4));
    }
}
